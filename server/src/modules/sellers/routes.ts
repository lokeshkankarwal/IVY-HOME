import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { sellerDashboard } from "../admin/admin.controller.js";
import { HttpError } from "../../middleware/error.js";
import { prisma } from "../../config/prisma.js";

export const sellersRouter = Router();
sellersRouter.get("/dashboard", requireAuth, requireRole("SELLER"), sellerDashboard);

// Seller attempting to mark SOLD — always 403 (backend enforcement)
sellersRouter.post(
  "/properties/:id/sold",
  requireAuth,
  async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role === "SUPERADMIN") return next();
    return next(new HttpError(403, "Forbidden"));
  },
);

sellersRouter.get("/me", requireAuth, requireRole("SELLER"), async (req, res) => {
  const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
  res.json(profile);
});
