import { Router } from "express";
import * as c from "./visits.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const visitsRouter = Router();
visitsRouter.post("/request", requireAuth, requireRole("CUSTOMER"), c.requestVisit);
visitsRouter.use(requireAuth, requireRole("SELLER"));
visitsRouter.get("/", c.list);
visitsRouter.post("/", c.create);
visitsRouter.patch("/:id", c.updateStatus);
