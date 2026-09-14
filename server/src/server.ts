import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import bcrypt from "bcryptjs";

async function seedSuperadmin() {
  const email = env.superadminEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  await prisma.user.create({
    data: {
      email,
      name: "Platform Owner",
      role: "SUPERADMIN",
      emailVerifiedAt: new Date(),
      passwordHash: await bcrypt.hash(env.superadminPassword, 12),
    },
  });
  console.log(`Seeded SUPERADMIN ${email}`);
}

async function main() {
  await seedSuperadmin();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
