import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(", ");
    return res.status(400).json({ error: message || "Validation failed", details: err.issues });
  }
  const anyErr = err as { status?: number; message?: string };
  if (typeof anyErr?.status === "number") {
    return res.status(anyErr.status).json({ error: anyErr.message ?? "Error" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
