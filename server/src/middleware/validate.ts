import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "./error.js";

export function validate(schema: ZodType, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      (req as Request & { validated: unknown }).validated = parsed;
      if (source === "query") Object.assign(req.query, parsed);
      else req[source] = parsed as never;
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        next(new HttpError(422, "Validation failed", e.issues));
      } else next(e);
    }
  };
}
