import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/error.js";

async function audit(req: Request, action: string, entityType: string, entityId?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      actorId: req.user?.id,
      action,
      entityType,
      entityId,
      metadata: metadata as object | undefined,
    },
  });
}

export async function dashboard(_req: Request, res: Response) {
  const [sellers, customers, properties, sold, pending, orders] = await Promise.all([
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.property.count(),
    prisma.property.count({ where: { status: "SOLD" } }),
    prisma.sellerProfile.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.order.count(),
  ]);
  res.json({ sellers, customers, properties, sold, pendingSellerApprovals: pending, orders });
}

export async function sellerRequests(_req: Request, res: Response) {
  const requests = await prisma.sellerProfile.findMany({
    where: { status: { in: ["PENDING_APPROVAL", "PENDING_VERIFICATION"] } },
    include: { user: { select: { id: true, email: true, name: true, phone: true, createdAt: true, emailVerifiedAt: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({ results: requests });
}

export async function sellers(_req: Request, res: Response) {
  const results = await prisma.sellerProfile.findMany({
    include: { user: { select: { id: true, email: true, name: true, phone: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ results });
}

export async function users(_req: Request, res: Response) {
  const results = await prisma.user.findMany({
    where: { role: { in: ["CUSTOMER", "SELLER"] } },
    select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true, emailVerifiedAt: true, sellerProfile: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ results });
}

export async function properties(_req: Request, res: Response) {
  const results = await prisma.property.findMany({
    include: { images: true, seller: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ results });
}

export async function reviewSeller(req: Request, res: Response) {
  const id = String(req.params.id);
  const { action, reason } = z.object({ action: z.enum(["APPROVE", "REJECT", "SUSPEND"]), reason: z.string().optional() }).parse(req.body);
  const profile = await prisma.sellerProfile.findFirst({
    where: { OR: [{ id }, { userId: id }] },
  });
  if (!profile) throw new HttpError(404, "Seller not found");
  const status = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "SUSPENDED";
  const updated = await prisma.sellerProfile.update({
    where: { id: profile.id },
    data: {
      status,
      rejectionReason: reason,
      approvedAt: action === "APPROVE" ? new Date() : profile.approvedAt,
      approvedById: req.user?.id,
    },
  });
  await audit(req, `SELLER_${action}`, "SellerProfile", profile.id, { reason });
  res.json(updated);
}

export async function markSold(req: Request, res: Response) {
  if (req.user?.role !== "SUPERADMIN") throw new HttpError(403, "Forbidden");
  const id = String(req.params.id);
  const { customerId } = z.object({ customerId: z.string().optional() }).parse(req.body ?? {});
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new HttpError(404, "Property not found");
  if (property.status === "SOLD") throw new HttpError(400, "Already sold");

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.property.update({
      where: { id: property.id },
      data: { status: "SOLD" },
    });
    await tx.cartItem.deleteMany({ where: { propertyId: property.id } });
    const order = await tx.order.create({
      data: {
        propertyId: property.id,
        customerId: customerId ?? null,
        status: "SOLD",
        soldPrice: property.price,
      },
    });
    return { property: updated, order };
  });
  await audit(req, "PROPERTY_SOLD", "Property", property.id, { orderId: result.order.id });
  res.json(result);
}

export async function auditLogs(_req: Request, res: Response) {
  const results = await prisma.auditLog.findMany({
    include: { actor: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ results });
}

export async function sellerDashboard(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const sellerId = req.user.id;
  const [totalProperties, activeProperties, totalClients, visits, high, medium, low, properties, upcoming, recent] =
    await Promise.all([
      prisma.property.count({ where: { sellerId } }),
      prisma.property.count({ where: { sellerId, status: "ACTIVE" } }),
      prisma.client.count({ where: { sellerId } }),
      prisma.propertyVisit.count({ where: { sellerId } }),
      prisma.client.count({ where: { sellerId, interestLevel: "HIGH" } }),
      prisma.client.count({ where: { sellerId, interestLevel: "MEDIUM" } }),
      prisma.client.count({ where: { sellerId, interestLevel: "LOW" } }),
      prisma.property.findMany({
        where: { sellerId },
        include: { interests: true, visits: true },
      }),
      prisma.propertyVisit.findMany({
        where: { sellerId, scheduledAt: { gte: new Date() }, status: "SCHEDULED" },
        include: { client: true, property: true },
        orderBy: { scheduledAt: "asc" },
        take: 10,
      }),
      prisma.clientInteraction.findMany({
        where: { sellerId },
        include: { client: true, property: true },
        orderBy: { timestamp: "desc" },
        take: 15,
      }),
    ]);
  const leads = await prisma.clientPropertyInterest.count({ where: { sellerId } });
  res.json({
    stats: {
      totalProperties,
      activeProperties,
      totalClients,
      totalLeads: leads,
      totalVisits: visits,
      highInterest: high,
      mediumInterest: medium,
      lowInterest: low,
    },
    properties: properties.map((p) => ({
      id: p.id,
      title: p.title,
      views: p.views,
      leads: p.interests.length,
      visits: p.visits.length,
      interestedClients: p.interests.filter((i) => i.interestLevel !== "LOW").length,
      status: p.status,
    })),
    clients: {
      high: await prisma.client.findMany({ where: { sellerId, interestLevel: "HIGH" } }),
      medium: await prisma.client.findMany({ where: { sellerId, interestLevel: "MEDIUM" } }),
      low: await prisma.client.findMany({ where: { sellerId, interestLevel: "LOW" } }),
    },
    upcomingVisits: upcoming,
    recentInteractions: recent,
  });
}
