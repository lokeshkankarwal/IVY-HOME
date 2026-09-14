import type { Request } from "express";
import { HttpError } from "./error.js";
import type { Role } from "@prisma/client";

export function assertUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export function assertRole(req: Request, ...roles: Role[]) {
  const user = assertUser(req);
  if (!roles.includes(user.role)) throw new HttpError(403, "Forbidden");
  return user;
}

export function assertSellerActive(status: string) {
  if (status !== "APPROVED") {
    throw new HttpError(403, "Seller account is not approved");
  }
}
