import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(root, ".env") });

export const BASE = (process.env.IVY_BASE_URL ?? "https://solve.ivy.homes").replace(/\/$/, "");
export const KEY = (process.env.IVY_API_KEY ?? "").trim();
export const PASSWORD = (process.env.IVY_DEMO_PASSWORD ?? "").trim();
export const LOCALITY = (process.env.IVY_ASSIGNED_LOCALITY ?? "").trim().toLowerCase();
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

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiresAt - 30000) {
    return cachedToken;
  }
  if (!KEY || !PASSWORD) return null;

  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": KEY,
      },
      body: JSON.stringify({
        email: "demo1@ivy.homes",
        password: PASSWORD,
      }),
    });
    const data = await res.json();
    const token = (data && (data.access_token || data.token)) || null;
    if (token) {
      cachedToken = token;
      const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 900;
      tokenExpiresAt = Date.now() + expiresInSec * 1000;
    }
    return token;
  } catch (err) {
    console.error("[getAuthToken error]:", err);
    return null;
  }
}

export async function ivy(
  pathAndQuery: string,
  init: RequestInit = {},
  keyIn: "header" | "query" | "none" = "header",
  useAuth = false
) {
  let url = `${BASE}${pathAndQuery}`;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (keyIn === "header" && KEY) headers.set("X-API-Key", KEY);
  if (keyIn === "query" && KEY) {
    url += (url.includes("?") ? "&" : "?") + `api_key=${encodeURIComponent(KEY)}`;
  }

  if (useAuth) {
    const token = await getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const method = init.method ?? "GET";
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  // Diagnostic logging (WITHOUT exposing secrets)
  const urlObj = new URL(url);
  const params = Object.fromEntries(urlObj.searchParams.entries());
  delete params["api_key"]; // Sanitize if query key was passed
  const safeBody = res.status >= 400 && json ? JSON.stringify(json).slice(0, 150) : "";
  console.log(`[API] ${method} ${urlObj.pathname} -> ${res.status} | params: ${JSON.stringify(params)} ${safeBody ? `| err: ${safeBody}` : ""}`);

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
