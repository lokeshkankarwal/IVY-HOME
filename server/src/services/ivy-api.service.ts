import { env } from "../config/env.js";
import { HttpError } from "../middleware/error.js";

type IvyInit = RequestInit & { token?: string };

async function ivyFetch<T>(path: string, init: IvyInit = {}): Promise<{ status: number; data: T; headers: Headers }> {
  if (!env.ivyApiKey || env.ivyApiKey.includes("XXXX")) {
    throw new HttpError(503, "Ivy API key is not configured. Set IVY_API_KEY in .env");
  }
  const url = `${env.ivyBaseUrl}${path}`;
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", env.ivyApiKey);
  headers.set("Accept", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    data = { raw: text } as T;
  }
  if (res.status === 429) throw new HttpError(429, "Ivy API rate limit exceeded");
  return { status: res.status, data, headers: res.headers };
}

export async function ivyLogin(email: string, password: string) {
  const { status, data } = await ivyFetch<Record<string, unknown>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (status >= 400) {
    throw new HttpError(status, String((data as { detail?: string }).detail ?? "Ivy login failed"), data);
  }
  return data;
}

export async function ivyGet(path: string, token?: string) {
  return ivyFetch(path, { method: "GET", token });
}

export async function ivySend(path: string, init: IvyInit) {
  return ivyFetch(path, init);
}

function qs(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export async function ivyListings(query: Record<string, string | number | undefined>, token?: string) {
  return ivyGet(`/v1/listings${qs(query)}`, token);
}

export async function ivyListing(id: string, token?: string) {
  const primary = await ivyGet(`/v1/listings/${encodeURIComponent(id)}`, token);
  if (primary.status !== 404) return primary;
  return ivyGet(`/v1/listing/${encodeURIComponent(id)}`, token);
}

export async function ivySimilar(id: string, token?: string) {
  const a = await ivyGet(`/v1/listings/${encodeURIComponent(id)}/similar`, token);
  if (a.status !== 404) return a;
  return ivyGet(`/v1/listing/${encodeURIComponent(id)}/similar`, token);
}

export async function ivyRentals(query: Record<string, string | number | undefined>, token?: string) {
  return ivyGet(`/v1/rentals${qs(query)}`, token);
}

export async function ivyRental(id: string, token?: string) {
  return ivyGet(`/v1/rentals/${encodeURIComponent(id)}`, token);
}

export async function ivyProjects(query: Record<string, string | number | undefined>, token?: string) {
  return ivyGet(`/v1/projects${qs(query)}`, token);
}

export async function ivyProject(id: string, token?: string) {
  return ivyGet(`/v1/projects/${encodeURIComponent(id)}`, token);
}

export async function ivyFavourites(token: string) {
  return ivyGet(`/v1/favourites`, token);
}

export async function ivyAddFavourite(id: string, token: string) {
  return ivySend(`/v1/favourites`, { method: "POST", token, body: JSON.stringify({ id }) });
}

export async function ivyRemoveFavourite(id: string, token: string) {
  return ivySend(`/v1/favourites/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

export async function ivyAnalytics(token?: string) {
  const a = await ivyGet(`/v1/analytics/summary`, token);
  if (a.status !== 404) return a;
  return ivyGet(`/v1/analytics`, token);
}

export async function ivyHealth() {
  const res = await fetch(`${env.ivyBaseUrl}/health`);
  return { status: res.status, data: await res.json() };
}

export { ivyFetch };
