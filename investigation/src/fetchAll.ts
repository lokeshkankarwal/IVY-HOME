import { ivy, writeJson, sleep } from "./client.js";

function extractList(json: unknown): unknown[] {
  if (!json || typeof json !== "object") return [];
  const o = json as Record<string, unknown>;
  for (const k of ["results", "items", "listings", "data", "rentals", "projects"]) {
    if (Array.isArray(o[k])) return o[k] as unknown[];
  }
  if (Array.isArray(json)) return json;
  return [];
}

export async function fetchAll(path: string, extraQuery = "") {
  const records: unknown[] = [];
  const pages: unknown[] = [];
  const sep = path.includes("?") || extraQuery ? "&" : "?";
  // Prefer offset because the assignment says each page reports limit, offset, and whether more remain.
  let offset = 0;
  const limit = 100;
  let used = "offset";
  let guard = 0;

  const first = await ivy(`${path}${extraQuery}${extraQuery || path.includes("?") ? "&" : "?"}limit=${limit}&offset=0`);
  pages.push({ offset: 0, status: first.status, keys: first.json && typeof first.json === "object" ? Object.keys(first.json as object) : [], sample: first.json });
  const firstObj = (first.json ?? {}) as Record<string, unknown>;
  const hasOffsetShape = "offset" in firstObj || "has_more" in firstObj || "next_offset" in firstObj;

  if (first.status >= 400 || !hasOffsetShape) {
    used = "page";
    let page = 1;
    while (guard++ < 200) {
      const r = await ivy(`${path}${extraQuery}${extraQuery || path.includes("?") ? "&" : "?"}limit=${limit}&page=${page}`);
      if (r.status >= 400) break;
      const list = extractList(r.json);
      pages.push({ page, status: r.status, count: list.length, meta: summarize(r.json) });
      records.push(...list);
      const meta = (r.json ?? {}) as Record<string, unknown>;
      const more = meta.has_more === true || meta.next_page != null;
      if (!more && list.length < limit) break;
      if (list.length === 0) break;
      page += 1;
      await sleep(20);
    }
  } else {
    offset = 0;
    guard = 0;
    while (guard++ < 400) {
      const r = await ivy(`${path}${extraQuery}${extraQuery || path.includes("?") ? "&" : "?"}limit=${limit}&offset=${offset}`);
      if (r.status >= 400) break;
      const list = extractList(r.json);
      const meta = (r.json ?? {}) as Record<string, unknown>;
      pages.push({ offset, status: r.status, count: list.length, meta: summarize(r.json) });
      records.push(...list);
      const next =
        typeof meta.next_offset === "number"
          ? meta.next_offset
          : offset + (typeof meta.limit === "number" ? (meta.limit as number) : limit);
      const more = meta.has_more === true || (typeof meta.has_more === "undefined" && list.length === limit);
      if (!more || list.length === 0) break;
      if (next === offset) break;
      offset = next as number;
      await sleep(20);
    }
  }

  writeJson(`raw/${path.replace(/\W+/g, "_")}_pages.json`, { used, pageCount: pages.length, records: records.length, pages: pages.slice(0, 5) });
  return { records, pages, used };
}

function summarize(json: unknown) {
  if (!json || typeof json !== "object") return json;
  const o = { ...(json as Record<string, unknown>) };
  for (const k of ["results", "items", "listings", "data"]) delete o[k];
  return o;
}

export { extractList };
