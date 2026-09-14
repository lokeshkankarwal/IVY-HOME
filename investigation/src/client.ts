import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(root, ".env") });

export const BASE = (process.env.IVY_BASE_URL ?? "https://solve.ivy.homes").replace(/\/$/, "");
export const KEY = process.env.IVY_API_KEY ?? "";
export const LOCALITY = (process.env.IVY_ASSIGNED_LOCALITY ?? "").toLowerCase();
export const REFERENCE = new Date("2026-09-10T00:00:00+05:30");

export type Finding = {
  endpoint: string;
  category: string;
  documented: string;
  actual: string;
  how_found: string;
  impact: string;
  evidence: string[];
};

export async function ivy(pathAndQuery: string, init: RequestInit = {}, keyIn: "header" | "query" | "none" = "header") {
  let url = `${BASE}${pathAndQuery}`;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (keyIn === "header" && KEY) headers.set("X-API-Key", KEY);
  if (keyIn === "query" && KEY) {
    url += (url.includes("?") ? "&" : "?") + `api_key=${encodeURIComponent(KEY)}`;
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text, url };
}

export function writeJson(rel: string, data: unknown) {
  const dest = path.join(root, "investigation", rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(data, null, 2));
  return dest;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
