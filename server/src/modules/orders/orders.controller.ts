import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/error.js";

export async function mine(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const orders = await prisma.order.findMany({
    where: { customerId: req.user.id },
    include: { property: { include: { images: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ results: orders });
}

export async function all(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    include: { property: true, customer: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ results: orders });
}
