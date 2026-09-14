import { Router } from "express";
import * as c from "./orders.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const ordersRouter = Router();
ordersRouter.get("/mine", requireAuth, requireRole("CUSTOMER", "SUPERADMIN"), c.mine);
ordersRouter.get("/", requireAuth, requireRole("SUPERADMIN"), c.all);
