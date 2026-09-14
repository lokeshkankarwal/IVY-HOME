import { Router } from "express";
import * as c from "./interactions.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const interactionsRouter = Router();
interactionsRouter.use(requireAuth, requireRole("SELLER"));
interactionsRouter.get("/", c.list);
interactionsRouter.post("/", c.create);
