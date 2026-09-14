import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/routes.js";
import { propertiesRouter } from "./modules/properties/routes.js";
import { favouritesRouter } from "./modules/favourites/routes.js";
import { cartRouter } from "./modules/cart/routes.js";
import { clientsRouter } from "./modules/clients/routes.js";
import { interactionsRouter } from "./modules/interactions/routes.js";
import { visitsRouter } from "./modules/visits/routes.js";
import { ordersRouter } from "./modules/orders/routes.js";
import { adminRouter } from "./modules/admin/routes.js";
import { sellersRouter } from "./modules/sellers/routes.js";
import { ivyRouter } from "./modules/ivy-api/routes.js";
import { ensureUploadDir } from "./services/storage.service.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  ensureUploadDir();
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use("/uploads", express.static(path.resolve(here, "../uploads")));
  app.use("/defaults", express.static(path.resolve(here, "../public/defaults")));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/properties", propertiesRouter);
  app.use("/api/favourites", favouritesRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/interactions", interactionsRouter);
  app.use("/api/visits", visitsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/seller", sellersRouter);
  app.use("/api/ivy", ivyRouter);

  app.use(errorHandler);
  return app;
}
