import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import bcrypt from "bcryptjs";

async function seedSuperadmin() {
  try {
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
  } catch (err) {
    console.warn("Notice: could not auto-seed superadmin at startup (DB may not be ready):", err);
  }
}

async function main() {
  await seedSuperadmin();
  const app = createApp();
  const port = Number(process.env.PORT || env.port || 4000);
  const host = "0.0.0.0";

  app.listen(port, host, () => {
    console.log(`API listening on http://${host}:${port}`);
  });
}

main().catch((e) => {
  console.error("Fatal startup error:", e);
  process.exit(1);
});
