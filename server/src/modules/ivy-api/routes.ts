import { Router } from "express";
import type { Request, Response } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import {
  ivyAddFavourite,
  ivyAnalytics,
  ivyFavourites,
  ivyHealth,
  ivyListing,
  ivyListings,
  ivyProject,
  ivyProjects,
  ivyRemoveFavourite,
  ivyRental,
  ivyRentals,
  ivySimilar,
} from "../../services/ivy-api.service.js";
import { HttpError } from "../../middleware/error.js";
import { prisma } from "../../config/prisma.js";

function ivyToken(req: Request) {
  return (req.cookies?.ivy_token as string | undefined) ?? undefined;
}

async function persistIvyFav(req: Request, listingId: string, add: boolean) {
  if (!req.user) return;
  if (add) {
    await prisma.favourite.upsert({
      where: { userId_ivyListingId: { userId: req.user.id, ivyListingId: listingId } },
      update: {},
      create: { userId: req.user.id, ivyListingId: listingId },
    });
  } else {
    await prisma.favourite.deleteMany({ where: { userId: req.user.id, ivyListingId: listingId } });
  }
}

export const ivyRouter = Router();

ivyRouter.get("/health", async (_req, res) => {
  res.json(await ivyHealth());
});

ivyRouter.get("/listings", optionalAuth, async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const { status, data } = await ivyListings(q, ivyToken(req));
  if (status >= 400) throw new HttpError(status, "Ivy listings failed", data);
  res.json(data);
});

ivyRouter.get("/listings/:id/similar", optionalAuth, async (req, res) => {
  const { status, data } = await ivySimilar(String(req.params.id), ivyToken(req));
  if (status >= 400) throw new HttpError(status, "Ivy similar failed", data);
  res.json(data);
});

ivyRouter.get("/listings/:id", optionalAuth, async (req, res) => {
  const { status, data } = await ivyListing(String(req.params.id), ivyToken(req));
  if (status >= 400) throw new HttpError(status, "Ivy listing failed", data);
  res.json(data);
});

ivyRouter.get("/rentals", optionalAuth, async (req, res) => {
  const q = req.query as Record<string, string>;
  const { status, data } = await ivyRentals(q, ivyToken(req));
  if (status >= 400) throw new HttpError(status, "Ivy rentals failed", data);
  res.json(data);
});

ivyRouter.get("/rentals/:id", optionalAuth, async (req, res) => {
  const { status, data } = await ivyRental(String(req.params.id), ivyToken(req));
  if (status >= 400) throw new HttpError(status, "Ivy rental failed", data);
  res.json(data);
});

ivyRouter.get("/projects", optionalAuth, async (req, res) => {
  const q = req.query as Record<string, string>;
  const { status, data } = await ivyProjects(q, ivyToken(req));
  if (status >= 400) throw new HttpError(status, "Ivy projects failed", data);
  res.json(data);
});

ivyRouter.get("/projects/:id", optionalAuth, async (req, res) => {
  const { status, data } = await ivyProject(String(req.params.id), ivyToken(req));
  if (status >= 400) throw new HttpError(status, "Ivy project failed", data);
  res.json(data);
});

ivyRouter.get("/favourites", requireAuth, async (req, res) => {
  const token = ivyToken(req);
  if (token) {
    const { status, data } = await ivyFavourites(token);
    if (status < 400) return res.json(data);
  }
  const local = await prisma.favourite.findMany({
    where: { userId: req.user!.id, ivyListingId: { not: null } },
  });
  res.json({ count: local.length, results: local });
});

ivyRouter.post("/favourites", requireAuth, async (req, res) => {
  const id = String(req.body.id ?? req.body.listing_id ?? "");
  if (!id) throw new HttpError(400, "id required");
  const token = ivyToken(req);
  await persistIvyFav(req, id, true);
  if (token) {
    const { status, data } = await ivyAddFavourite(id, token);
    return res.status(status < 400 ? 201 : status).json(data);
  }
  res.status(201).json({ ok: true, id });
});

ivyRouter.delete("/favourites/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const token = ivyToken(req);
  await persistIvyFav(req, id, false);
  if (token) {
    const { status, data } = await ivyRemoveFavourite(id, token);
    return res.status(status < 400 ? 200 : status).json(data);
  }
  res.json({ ok: true });
});

ivyRouter.get("/analytics/summary", optionalAuth, async (req, res) => {
  const { status, data } = await ivyAnalytics(ivyToken(req));
  if (status >= 400) throw new HttpError(status, "Ivy analytics failed", data);
  res.json(data);
});
