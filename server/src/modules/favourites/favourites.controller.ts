import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/error.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const items = await prisma.favourite.findMany({
    where: { userId: req.user.id },
    include: { property: { include: { images: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ count: items.length, results: items });
}

export async function add(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const body = z.object({ propertyId: z.string().optional(), ivyListingId: z.string().optional() }).parse(req.body);
  if (!body.propertyId && !body.ivyListingId) throw new HttpError(400, "propertyId or ivyListingId required");
  if (body.propertyId) {
    const p = await prisma.property.findUnique({ where: { id: body.propertyId } });
    if (!p || p.status === "SOLD") throw new HttpError(400, "Property is not available");
  }
  const fav = await prisma.favourite.upsert({
    where: body.propertyId
      ? { userId_propertyId: { userId: req.user.id, propertyId: body.propertyId } }
      : { userId_ivyListingId: { userId: req.user.id, ivyListingId: body.ivyListingId! } },
    update: {},
    create: { userId: req.user.id, propertyId: body.propertyId, ivyListingId: body.ivyListingId },
  });
  res.status(201).json(fav);
}

export async function remove(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const id = String(req.params.id);
  await prisma.favourite.deleteMany({
    where: {
      userId: req.user.id,
      OR: [{ id }, { propertyId: id }, { ivyListingId: id }],
    },
  });
  res.json({ ok: true });
}
