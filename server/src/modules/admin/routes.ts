import { Router } from "express";
import * as c from "./admin.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("SUPERADMIN"));
adminRouter.get("/dashboard", c.dashboard);
adminRouter.get("/sellers/requests", c.sellerRequests);
adminRouter.get("/sellers", c.sellers);
adminRouter.post("/sellers/:id/review", c.reviewSeller);
adminRouter.get("/users", c.users);
adminRouter.get("/properties", c.properties);
adminRouter.post("/properties/:id/sold", c.markSold);
adminRouter.get("/audit-logs", c.auditLogs);
