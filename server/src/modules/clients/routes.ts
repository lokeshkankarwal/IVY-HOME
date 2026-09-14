import { Router } from "express";
import * as c from "./clients.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const clientsRouter = Router();
clientsRouter.use(requireAuth, requireRole("SELLER"));
clientsRouter.get("/", c.list);
clientsRouter.post("/", c.create);
clientsRouter.get("/:id", c.get);
clientsRouter.patch("/:id", c.update);
clientsRouter.post("/:id/interests", c.addInterest);
