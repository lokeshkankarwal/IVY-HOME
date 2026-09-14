import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../../.env") });
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  // Supports a comma-separated list, e.g. "https://ivy-home-client.vercel.app,http://localhost:5173"
  clientOrigin: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? "",
  ivyBaseUrl: (process.env.IVY_BASE_URL ?? "https://solve.ivy.homes").replace(/\/$/, ""),
  ivyApiKey: process.env.IVY_API_KEY ?? "",
  ivyAssignedLocality: (process.env.IVY_ASSIGNED_LOCALITY ?? "").toLowerCase(),
  superadminEmail: process.env.SUPERADMIN_EMAIL ?? "admin@ivy.local",
  superadminPassword: process.env.SUPERADMIN_PASSWORD ?? "Admin123!",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "Ivy Homes <noreply@ivy.local>",
};
