import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/error.js";

async function getCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: { items: { include: { property: { include: { images: true } } } } },
  });
}

export async function get(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const cart = await getCart(req.user.id);
  res.json(cart);
}

export async function add(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const { propertyId } = z.object({ propertyId: z.string() }).parse(req.body);
  const p = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!p) throw new HttpError(404, "Property not found");
  if (p.status === "SOLD" || p.status !== "ACTIVE") throw new HttpError(400, "Property is not available");
  const cart = await getCart(req.user.id);
  await prisma.cartItem.upsert({
    where: { cartId_propertyId: { cartId: cart.id, propertyId } },
    update: {},
    create: { cartId: cart.id, propertyId },
  });
  res.status(201).json(await getCart(req.user.id));
}

export async function remove(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const cart = await getCart(req.user.id);
  const propertyId = String(req.params.propertyId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, propertyId } });
  res.json(await getCart(req.user.id));
}
