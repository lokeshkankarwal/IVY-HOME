import { Router } from "express";
import * as c from "./favourites.controller.js";
import { requireAuth } from "../../middleware/auth.js";

export const favouritesRouter = Router();
favouritesRouter.use(requireAuth);
favouritesRouter.get("/", c.list);
favouritesRouter.post("/", c.add);
favouritesRouter.delete("/:id", c.remove);
