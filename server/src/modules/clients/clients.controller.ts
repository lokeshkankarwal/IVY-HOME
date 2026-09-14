import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/error.js";

const clientInput = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  interestLevel: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
});

export async function list(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const interest = req.query.interest as string | undefined;
  const clients = await prisma.client.findMany({
    where: {
      sellerId: req.user.id,
      ...(interest ? { interestLevel: interest as never } : {}),
    },
    include: { interests: true, visits: true, interactions: { orderBy: { timestamp: "desc" }, take: 3 } },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ results: clients });
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const body = clientInput.parse(req.body);
  const client = await prisma.client.create({
    data: {
      sellerId: req.user.id,
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      notes: body.notes,
      interestLevel: body.interestLevel ?? "MEDIUM",
    },
  });
  res.status(201).json(client);
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const id = String(req.params.id);
  const client = await prisma.client.findFirst({
    where: { id, sellerId: req.user.id },
    include: {
      interests: { include: { property: true } },
      interactions: { orderBy: { timestamp: "desc" } },
      visits: { include: { property: true }, orderBy: { scheduledAt: "desc" } },
    },
  });
  if (!client) throw new HttpError(404, "Client not found");
  res.json(client);
}

export async function update(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const id = String(req.params.id);
  const existing = await prisma.client.findFirst({ where: { id, sellerId: req.user.id } });
  if (!existing) throw new HttpError(404, "Client not found");
  const body = clientInput.partial().parse(req.body);
  const client = await prisma.client.update({
    where: { id: existing.id },
    data: { ...body, email: body.email === "" ? null : body.email },
  });
  res.json(client);
}

export async function addInterest(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const id = String(req.params.id);
  const client = await prisma.client.findFirst({ where: { id, sellerId: req.user.id } });
  if (!client) throw new HttpError(404, "Client not found");
  const body = z
    .object({
      propertyId: z.string(),
      interestLevel: z.enum(["HIGH", "MEDIUM", "LOW"]),
      budget: z.coerce.number().optional(),
      notes: z.string().optional(),
    })
    .parse(req.body);
  const prop = await prisma.property.findFirst({ where: { id: body.propertyId, sellerId: req.user.id } });
  if (!prop) throw new HttpError(404, "Property not found");
  const rec = await prisma.clientPropertyInterest.upsert({
    where: { clientId_propertyId: { clientId: client.id, propertyId: prop.id } },
    update: { interestLevel: body.interestLevel, budget: body.budget, notes: body.notes },
    create: {
      clientId: client.id,
      propertyId: prop.id,
      sellerId: req.user.id,
      interestLevel: body.interestLevel,
      budget: body.budget,
      notes: body.notes,
    },
  });
  res.status(201).json(rec);
}
