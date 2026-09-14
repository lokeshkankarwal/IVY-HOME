import { Router } from "express";
import * as c from "./cart.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const cartRouter = Router();
cartRouter.use(requireAuth, requireRole("CUSTOMER", "SUPERADMIN"));
cartRouter.get("/", c.get);
cartRouter.post("/", c.add);
cartRouter.delete("/:propertyId", c.remove);
