import { z } from "zod";
import type { Request, Response } from "express";
import { Prisma, PropertyStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/error.js";
import { defaultImageForType, deleteLocalFile, saveLocalFile } from "../../services/storage.service.js";

const propertyInput = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  propertyType: z.enum(["APARTMENT", "VILLA", "INDEPENDENT_HOUSE", "PLOT", "BUILDER_FLOOR"]),
  bhk: z.coerce.number().int().min(0),
  bathrooms: z.coerce.number().int().min(0).default(1),
  price: z.coerce.number().int().min(0),
  carpetArea: z.coerce.number().int().min(0),
  superBuiltUpArea: z.coerce.number().int().min(0),
  furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"]),
  floor: z.coerce.number().int().optional(),
  totalFloors: z.coerce.number().int().optional(),
  parking: z.coerce.number().int().default(0),
  address: z.string().min(3),
  locality: z.string().min(2),
  city: z.string().min(2),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  contactName: z.string().min(2),
  contactPhone: z.string().min(8),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]).optional(),
});

function serialize(p: {
  images: { path: string; isPrimary: boolean; sortOrder: number; id: string }[];
  propertyType: string;
  status: PropertyStatus;
  [k: string]: unknown;
}) {
  const images = [...p.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = images.find((i) => i.isPrimary)?.path ?? images[0]?.path ?? defaultImageForType(p.propertyType);
  return { ...p, images, primaryImage: primary };
}

async function requireApprovedSeller(userId: string) {
  const profile = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (!profile || profile.status !== "APPROVED") throw new HttpError(403, "Seller is not approved");
  return profile;
}

export async function listPublic(req: Request, res: Response) {
  const q = req.query as Record<string, string>;
  const page = Math.max(1, Number(q.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(q.limit ?? 12)));
  const where: Prisma.PropertyWhereInput = {
    status: q.status === "SOLD" ? "SOLD" : "ACTIVE",
  };
  if (q.locality) where.locality = { contains: q.locality, mode: "insensitive" };
  if (q.city) where.city = { contains: q.city, mode: "insensitive" };
  if (q.propertyType) where.propertyType = q.propertyType as never;
  if (q.bhk) where.bhk = Number(q.bhk);
  if (q.furnishing) where.furnishing = q.furnishing as never;
  if (q.minPrice || q.maxPrice) {
    where.price = {};
    if (q.minPrice) where.price.gte = Number(q.minPrice);
    if (q.maxPrice) where.price.lte = Number(q.maxPrice);
  }
  if (q.q) {
    where.OR = [
      { title: { contains: q.q, mode: "insensitive" } },
      { locality: { contains: q.q, mode: "insensitive" } },
      { description: { contains: q.q, mode: "insensitive" } },
    ];
  }
  const orderBy: Prisma.PropertyOrderByWithRelationInput =
    q.sort === "price_asc"
      ? { price: "asc" }
      : q.sort === "price_desc"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const [total, items] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      include: { images: true, seller: { select: { name: true } } },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  res.json({ total, page, limit, results: items.map(serialize) });
}

export async function getPublic(req: Request, res: Response) {
  const id = String(req.params.id);
  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: true, seller: { select: { id: true, name: true, phone: true, email: true } } },
  });
  if (!p) throw new HttpError(404, "Property not found");
  if (p.status === "DRAFT" || p.status === "INACTIVE") {
    if (req.user?.role !== "SUPERADMIN" && req.user?.id !== p.sellerId) {
      throw new HttpError(404, "Property not found");
    }
  }
  await prisma.property.update({ where: { id: p.id }, data: { views: { increment: 1 } } });
  res.json(serialize({ ...p, views: p.views + 1 }));
}

export async function createMine(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  await requireApprovedSeller(req.user.id);
  const body = propertyInput.parse(req.body);
  const p = await prisma.property.create({
    data: {
      ...body,
      locality: body.locality.toLowerCase(),
      sellerId: req.user.id,
      status: body.status ?? "ACTIVE",
    },
    include: { images: true },
  });
  res.status(201).json(serialize(p));
}

export async function updateMine(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  await requireApprovedSeller(req.user.id);
  const id = String(req.params.id);
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Property not found");
  if (existing.sellerId !== req.user.id) throw new HttpError(403, "Forbidden");
  if (existing.status === "SOLD") throw new HttpError(400, "Cannot edit a SOLD property");
  const body = propertyInput.partial().parse(req.body);
  if ((body as { status?: string }).status === "SOLD") {
    throw new HttpError(403, "Sellers cannot mark a property as SOLD");
  }
  const p = await prisma.property.update({
    where: { id: existing.id },
    data: {
      ...body,
      locality: body.locality ? body.locality.toLowerCase() : undefined,
    },
    include: { images: true },
  });
  res.json(serialize(p));
}

export async function deactivateMine(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const id = String(req.params.id);
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Property not found");
  if (existing.sellerId !== req.user.id) throw new HttpError(403, "Forbidden");
  if (existing.status === "SOLD") throw new HttpError(400, "Cannot change status of a SOLD property");
  const p = await prisma.property.update({
    where: { id: existing.id },
    data: { status: existing.status === "INACTIVE" ? "ACTIVE" : "INACTIVE" },
    include: { images: true },
  });
  res.json(serialize(p));
}

export async function listMine(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const items = await prisma.property.findMany({
    where: { sellerId: req.user.id },
    include: { images: true, interests: true, visits: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ results: items.map(serialize) });
}

export async function uploadImages(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const id = String(req.params.id);
  const existing = await prisma.property.findUnique({ where: { id }, include: { images: true } });
  if (!existing) throw new HttpError(404, "Property not found");
  if (existing.sellerId !== req.user.id && req.user.role !== "SUPERADMIN") throw new HttpError(403, "Forbidden");
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) throw new HttpError(400, "No files uploaded");
  let order = existing.images.length;
  const created = [];
  for (const f of files) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.mimetype)) {
      throw new HttpError(400, "Only jpeg, png, webp, gif are allowed");
    }
    if (f.size > 5 * 1024 * 1024) throw new HttpError(400, "Each image must be under 5MB");
    const filename = `${existing.id}-${Date.now()}-${order}-${f.originalname.replace(/\s+/g, "_")}`;
    const path = saveLocalFile(filename, f.buffer);
    const img = await prisma.propertyImage.create({
      data: {
        propertyId: existing.id,
        path,
        sortOrder: order,
        isPrimary: existing.images.length === 0 && order === 0,
      },
    });
    created.push(img);
    order += 1;
  }
  const p = await prisma.property.findUnique({ where: { id: existing.id }, include: { images: true } });
  res.status(201).json({ uploaded: created, property: serialize(p!) });
}

export async function deleteImage(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const imageId = String(req.params.imageId);
  const img = await prisma.propertyImage.findUnique({ include: { property: true }, where: { id: imageId } });
  if (!img) throw new HttpError(404, "Image not found");
  if (img.property.sellerId !== req.user.id && req.user.role !== "SUPERADMIN") throw new HttpError(403, "Forbidden");
  deleteLocalFile(img.path);
  await prisma.propertyImage.delete({ where: { id: img.id } });
  if (img.isPrimary) {
    const next = await prisma.propertyImage.findFirst({
      where: { propertyId: img.propertyId },
      orderBy: { sortOrder: "asc" },
    });
    if (next) await prisma.propertyImage.update({ where: { id: next.id }, data: { isPrimary: true } });
  }
  res.json({ ok: true });
}

export async function setPrimary(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const imageId = String(req.params.imageId);
  const img = await prisma.propertyImage.findUnique({ include: { property: true }, where: { id: imageId } });
  if (!img) throw new HttpError(404, "Image not found");
  if (img.property.sellerId !== req.user.id) throw new HttpError(403, "Forbidden");
  await prisma.$transaction([
    prisma.propertyImage.updateMany({ where: { propertyId: img.propertyId }, data: { isPrimary: false } }),
    prisma.propertyImage.update({ where: { id: img.id }, data: { isPrimary: true } }),
  ]);
  res.json({ ok: true });
}

export async function reorderImages(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const id = String(req.params.id);
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Property not found");
  if (existing.sellerId !== req.user.id) throw new HttpError(403, "Forbidden");
  const { order } = z.object({ order: z.array(z.string()) }).parse(req.body);
  await prisma.$transaction(
    order.map((id, i) => prisma.propertyImage.update({ where: { id }, data: { sortOrder: i } })),
  );
  res.json({ ok: true });
}

export async function mapPoints(req: Request, res: Response) {
  const items = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      title: true,
      price: true,
      latitude: true,
      longitude: true,
      locality: true,
      bhk: true,
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      propertyType: true,
    },
  });
  res.json({
    results: items.map((p) => ({
      ...p,
      primaryImage: p.images[0]?.path ?? defaultImageForType(p.propertyType),
    })),
  });
}
