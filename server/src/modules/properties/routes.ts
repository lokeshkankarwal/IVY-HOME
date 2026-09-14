import { Router } from "express";
import multer from "multer";
import * as c from "./properties.controller.js";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
});

export const propertiesRouter = Router();

propertiesRouter.get("/", optionalAuth, c.listPublic);
propertiesRouter.get("/map", c.mapPoints);
propertiesRouter.get("/mine", requireAuth, requireRole("SELLER", "SUPERADMIN"), c.listMine);
propertiesRouter.post("/", requireAuth, requireRole("SELLER"), c.createMine);

// Image shortcut routes (frontend calls without property-ID prefix)
propertiesRouter.post("/images/:imageId/primary", requireAuth, requireRole("SELLER"), c.setPrimary);
propertiesRouter.delete("/images/:imageId", requireAuth, requireRole("SELLER", "SUPERADMIN"), c.deleteImage);

propertiesRouter.get("/:id", optionalAuth, c.getPublic);
propertiesRouter.patch("/:id", requireAuth, requireRole("SELLER"), c.updateMine);
propertiesRouter.post("/:id/deactivate", requireAuth, requireRole("SELLER"), c.deactivateMine);
propertiesRouter.post("/:id/images", requireAuth, requireRole("SELLER", "SUPERADMIN"), upload.array("photos", 8), c.uploadImages);
propertiesRouter.delete("/:id/images/:imageId", requireAuth, requireRole("SELLER", "SUPERADMIN"), c.deleteImage);
propertiesRouter.post("/:id/images/:imageId/primary", requireAuth, requireRole("SELLER"), c.setPrimary);
propertiesRouter.post("/:id/images/reorder", requireAuth, requireRole("SELLER"), c.reorderImages);

