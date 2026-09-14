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

export async function checkout(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: {
      items: {
        include: {
          property: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new HttpError(400, "Your cart is empty");
  }

  const customer = await prisma.user.findUnique({ where: { id: req.user.id } });
  const customerName = customer?.name || req.user.name || "Customer";
  const customerEmail = customer?.email || req.user.email || "";
  const customerPhone = customer?.phone || "N/A";

  const createdOrders = [];

  for (const item of cart.items) {
    const prop = item.property;
    if (!prop) continue;

    // 1. Create the Order
    const order = await prisma.order.create({
      data: {
        customerId: req.user.id,
        propertyId: prop.id,
        status: "INITIATED",
        soldPrice: prop.price,
      },
    });
    createdOrders.push(order);

    // 2. If property has a seller, update the seller's portal / CRM
    if (prop.sellerId) {
      // Find or create the Client record for the seller
      let client = await prisma.client.findFirst({
        where: {
          sellerId: prop.sellerId,
          OR: [
            ...(customerEmail ? [{ email: customerEmail }] : []),
            ...(customerPhone && customerPhone !== "N/A" ? [{ phone: customerPhone }] : []),
          ],
        },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            sellerId: prop.sellerId,
            name: customerName,
            email: customerEmail || null,
            phone: customerPhone !== "N/A" ? customerPhone : "Contact via Ivy Portal",
            interestLevel: "HIGH",
            notes: `Customer initiated Purchase Closing for "${prop.title}". Order ID: ${order.id}.`,
          },
        });
      } else {
        await prisma.client.update({
          where: { id: client.id },
          data: {
            interestLevel: "HIGH",
            notes: `${client.notes ? client.notes + "\n" : ""}Customer initiated Purchase Closing for "${prop.title}". Order ID: ${order.id}.`,
          },
        });
      }

      // Upsert ClientPropertyInterest
      await prisma.clientPropertyInterest.upsert({
        where: {
          clientId_propertyId: {
            clientId: client.id,
            propertyId: prop.id,
          },
        },
        update: {
          interestLevel: "HIGH",
          budget: prop.price,
          notes: `Purchase closing order placed on ${new Date().toLocaleDateString()}.`,
        },
        create: {
          clientId: client.id,
          propertyId: prop.id,
          sellerId: prop.sellerId,
          interestLevel: "HIGH",
          budget: prop.price,
          notes: `Purchase closing order placed on ${new Date().toLocaleDateString()}.`,
        },
      });

      // Create a ClientInteraction for the seller's dashboard
      await prisma.clientInteraction.create({
        data: {
          clientId: client.id,
          sellerId: prop.sellerId,
          propertyId: prop.id,
          type: "NOTE",
          notes: `Purchase Closing Order placed for "${prop.title}" (Valuation: ₹${prop.price.toLocaleString("en-IN")}). Buyer: ${customerName} (${customerEmail}).`,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "PURCHASE_CLOSING_ORDER",
        entityType: "PROPERTY",
        entityId: prop.id,
        metadata: { orderId: order.id, price: prop.price, sellerId: prop.sellerId },
      },
    });
  }

  // Clear cart items
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  res.json({
    success: true,
    orders: createdOrders,
    message: `Purchase closing successfully initiated for ${createdOrders.length} property! The seller's CRM has been updated.`,
  });
}
