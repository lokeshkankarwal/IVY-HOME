import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/error.js";

export async function list(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const upcoming = req.query.upcoming === "true";
  const items = await prisma.propertyVisit.findMany({
    where: {
      sellerId: req.user.id,
      ...(upcoming ? { scheduledAt: { gte: new Date() }, status: "SCHEDULED" } : {}),
    },
    include: { client: true, property: true },
    orderBy: { scheduledAt: "asc" },
  });
  res.json({ results: items });
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const body = z
    .object({
      clientId: z.string(),
      propertyId: z.string(),
      scheduledAt: z.string(),
      notes: z.string().optional(),
    })
    .parse(req.body);
  const client = await prisma.client.findFirst({ where: { id: body.clientId, sellerId: req.user.id } });
  const property = await prisma.property.findFirst({ where: { id: body.propertyId, sellerId: req.user.id } });
  if (!client || !property) throw new HttpError(404, "Client or property not found");
  const visit = await prisma.propertyVisit.create({
    data: {
      clientId: client.id,
      propertyId: property.id,
      sellerId: req.user.id,
      scheduledAt: new Date(body.scheduledAt),
      notes: body.notes,
    },
  });
  await prisma.clientInteraction.create({
    data: {
      clientId: client.id,
      propertyId: property.id,
      sellerId: req.user.id,
      type: "VISIT",
      notes: body.notes || `Visit scheduled for ${body.scheduledAt}`,
    },
  });
  res.status(201).json(visit);
}

export async function updateStatus(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const id = String(req.params.id);
  const body = z.object({ status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]), notes: z.string().optional() }).parse(req.body);
  const visit = await prisma.propertyVisit.findFirst({ where: { id, sellerId: req.user.id } });
  if (!visit) throw new HttpError(404, "Visit not found");
  const updated = await prisma.propertyVisit.update({
    where: { id: visit.id },
    data: { status: body.status, notes: body.notes ?? visit.notes },
  });
  res.json(updated);
}

export async function requestVisit(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const body = z
    .object({ propertyId: z.string(), scheduledAt: z.string(), notes: z.string().optional(), name: z.string().optional(), phone: z.string().optional() })
    .parse(req.body);
  const property = await prisma.property.findUnique({ where: { id: body.propertyId } });
  if (!property || property.status !== "ACTIVE") throw new HttpError(400, "Property not available");
  let client = await prisma.client.findFirst({
    where: { sellerId: property.sellerId, phone: req.user.email },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        sellerId: property.sellerId,
        name: body.name ?? req.user.name,
        phone: body.phone ?? req.user.email,
        email: req.user.email,
        notes: "Created from customer visit request",
        interestLevel: "MEDIUM",
      },
    });
  }
  const visit = await prisma.propertyVisit.create({
    data: {
      clientId: client.id,
      propertyId: property.id,
      sellerId: property.sellerId,
      scheduledAt: new Date(body.scheduledAt),
      notes: body.notes,
    },
  });
  res.status(201).json(visit);
}
