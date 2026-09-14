import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Seller123!", 12);
  const custPass = await bcrypt.hash("Customer123!", 12);

  const seller = await prisma.user.upsert({
    where: { email: "seller@ivy.local" },
    update: {},
    create: {
      email: "seller@ivy.local",
      name: "Ananya Realty",
      phone: "+919800011122",
      role: "SELLER",
      emailVerifiedAt: new Date(),
      passwordHash: password,
      sellerProfile: {
        create: { companyName: "Ananya Realty", status: "APPROVED", approvedAt: new Date() },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@ivy.local" },
    update: {},
    create: {
      email: "customer@ivy.local",
      name: "Rahul Mehta",
      phone: "+919811122233",
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
      passwordHash: custPass,
    },
  });

  const count = await prisma.property.count({ where: { sellerId: seller.id } });
  if (count === 0) {
    await prisma.property.create({
      data: {
        sellerId: seller.id,
        title: "3 BHK Apartment in Whitefield",
        description:
          "Corner 3 BHK with park view, covered parking, and clubhouse access. Close to ITPL and metro feeder routes.",
        propertyType: "APARTMENT",
        bhk: 3,
        bathrooms: 3,
        price: 8500000,
        carpetArea: 1450,
        superBuiltUpArea: 1780,
        furnishing: "SEMI_FURNISHED",
        floor: 7,
        totalFloors: 18,
        parking: 1,
        address: "Prestige Lakeside, Whitefield",
        locality: "whitefield",
        city: "Bengaluru",
        latitude: 12.9698,
        longitude: 77.7499,
        contactName: "Ananya Realty",
        contactPhone: "+919800011122",
        status: "ACTIVE",
      },
    });
    await prisma.property.create({
      data: {
        sellerId: seller.id,
        title: "2 BHK Villa plot-adjacent home",
        description: "Independent 2 BHK with garden, east facing, suitable for a small family.",
        propertyType: "INDEPENDENT_HOUSE",
        bhk: 2,
        bathrooms: 2,
        price: 6200000,
        carpetArea: 1100,
        superBuiltUpArea: 1320,
        furnishing: "UNFURNISHED",
        floor: 0,
        totalFloors: 2,
        parking: 1,
        address: "Sarjapur Road",
        locality: "sarjapur road",
        city: "Bengaluru",
        latitude: 12.9012,
        longitude: 77.6844,
        contactName: "Ananya Realty",
        contactPhone: "+919800011122",
        status: "ACTIVE",
      },
    });
  }

  console.log("Seed complete. Demo logins:");
  console.log("  SUPERADMIN  admin@ivy.local / Admin123!");
  console.log("  SELLER      seller@ivy.local / Seller123!");
  console.log("  CUSTOMER    customer@ivy.local / Customer123!");
}

main()
  .finally(() => prisma.$disconnect());
