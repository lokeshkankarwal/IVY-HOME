import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, KEY, LOCALITY, REFERENCE, ivy, writeJson, type Finding } from "./client.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CATEGORIES = new Set([
  "auth",
  "pagination",
  "units",
  "filters",
  "sorting",
  "timestamps",
  "duplicates",
  "completeness",
  "data_quality",
  "fraud",
  "consistency",
  "missing_endpoint",
  "undocumented_endpoint",
]);

type Rec = Record<string, unknown>;

function asObj(v: unknown): Rec {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
}

function listOf(json: unknown): Rec[] {
  const o = asObj(json);
  for (const k of ["results", "items", "listings", "rentals", "projects", "data"]) {
    if (Array.isArray(o[k])) return o[k] as Rec[];
  }
  if (Array.isArray(json)) return json as Rec[];
  return [];
}

function q(params: Rec) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

async function fetchCollection(pathname: string) {
  const all: Rec[] = [];
  const pageMetas: Rec[] = [];
  const limit = 100;
  let offset = 0;
  let mode: "offset" | "page" = "offset";
  const probe = await ivy(`${pathname}?limit=${limit}&offset=0`);
  const meta = asObj(probe.json);
  const offsetLike = ["offset", "has_more", "next_offset", "limit"].some((k) => k in meta) && !("page" in meta && "page_size" in meta && !("offset" in meta));
  // Prefer whatever the first response actually used
  if (probe.status < 400 && ("offset" in meta || "has_more" in meta)) mode = "offset";
  else mode = "page";

  if (mode === "offset") {
    for (let i = 0; i < 400; i++) {
      const r = await ivy(`${pathname}?limit=${limit}&offset=${offset}`);
      if (r.status >= 400) {
        pageMetas.push({ offset, status: r.status, body: r.json });
        break;
      }
      const rows = listOf(r.json);
      const m = asObj(r.json);
      pageMetas.push({
        offset,
        status: r.status,
        returned: rows.length,
        limit: m.limit,
        offset_echo: m.offset,
        has_more: m.has_more,
        total: m.total,
        keys: Object.keys(m),
      });
      all.push(...rows);
      const hasMore = m.has_more === true;
      const next = typeof m.next_offset === "number" ? m.next_offset : offset + (Number(m.limit ?? rows.length) || limit);
      if (!hasMore && rows.length === 0) break;
      if (!hasMore && m.has_more === false) break;
      if (typeof m.has_more === "undefined") {
        if (rows.length < (Number(m.limit) || limit)) break;
      }
      if (next === offset) {
        if (!hasMore) break;
        offset += limit;
      } else offset = next;
      if (rows.length === 0) break;
    }
  } else {
    for (let page = 1; page <= 400; page++) {
      const r = await ivy(`${pathname}?limit=${limit}&page=${page}`);
      if (r.status >= 400) break;
      const rows = listOf(r.json);
      const m = asObj(r.json);
      pageMetas.push({ page, status: r.status, returned: rows.length, total: m.total, page_size: m.page_size, keys: Object.keys(m) });
      all.push(...rows);
      if (rows.length === 0) break;
      if (typeof m.total === "number" && all.length >= m.total) break;
      if (rows.length < limit) break;
    }
  }
  writeJson(`raw/${pathname.replace(/\W+/g, "_")}.meta.json`, { mode, count: all.length, pageMetas });
  writeJson(`raw/${pathname.replace(/\W+/g, "_")}.json`, all);
  return { all, pageMetas, mode, probe };
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function str(v: unknown) {
  return v == null ? "" : String(v);
}

function idOf(r: Rec) {
  return str(r.listing_id || r.project_id || r.id);
}

function propertyKey(r: Rec) {
  if (r.property_id) return `pid:${r.property_id}`;
  if (r.canonical_id) return `cid:${r.canonical_id}`;
  const url = str(r.listing_url).replace(/\/$/, "").toLowerCase();
  if (url) return `url:${url}`;
  return [
    str(r.apartment_name).toLowerCase(),
    str(r.locality).toLowerCase(),
    str(r.bedroom),
    str(r.floor),
    str(r.carpet_area),
    str(r.price),
    str(r.latitude),
    str(r.longitude),
  ].join("|");
}

function isCorrupt(r: Rec): string | null {
  const price = num(r.price);
  const carpet = num(r.carpet_area);
  const sba = num(r.super_built_up_area ?? r.super_builtup_area);
  const bed = num(r.bedroom ?? r.bhk);
  const bath = num(r.bathroom ?? r.bathrooms);
  const floor = num(r.floor);
  const total = num(r.total_floors);
  const lat = num(r.latitude);
  const lon = num(r.longitude);

  if (price != null && price < 0) return "negative_price";
  if (carpet != null && carpet < 0) return "negative_area";
  if (bed != null && bed < 0) return "negative_bedroom";
  if (bath != null && bath < 0) return "negative_bathroom";
  if (carpet != null && sba != null && carpet > sba && sba > 0) return "carpet_gt_sba";
  if (floor != null && total != null && total > 0 && floor > total) return "floor_gt_total";
  if (bed != null && bed > 20) return "impossible_bedroom";
  if (bath != null && bath > 20) return "impossible_bathroom";
  if (lat != null && (lat < 6 || lat > 37)) return "lat_outside_india";
  if (lon != null && (lon < 68 || lon > 98)) return "lon_outside_india";
  if (price === 0 && carpet === 0) return "zero_price_and_area";
  return null;
}

function ppsqft(r: Rec) {
  const price = num(r.price);
  const carpet = num(r.carpet_area);
  if (!price || !carpet || carpet <= 0) return null;
  return price / carpet;
}

function looksFake(r: Rec, contactCounts: Map<string, number>, descCounts: Map<string, number>): string | null {
  const contact = str(r.posted_by_contact);
  const desc = str(r.description).trim().toLowerCase();
  const pps = ppsqft(r);
  if (contact && (contactCounts.get(contact) ?? 0) >= 8) return "shared_enquiry_contact";
  if (desc && desc.length > 20 && (descCounts.get(desc) ?? 0) >= 6) return "cloned_description";
  if (pps != null && (pps < 200 || pps > 100000)) return "impossible_price_per_sqft";
  const flags = str(r.flags) + str(r.listing_source) + str(r.tags);
  if (/fake|spam|enquiry.?bait|lead.?gen/i.test(flags)) return "flagged";
  if (r.is_fake === true || r.fake === true) return "explicit_fake";
  return null;
}

async function main() {
  const findings: Finding[] = [];
  const add = (f: Finding) => {
    if (!CATEGORIES.has(f.category)) throw new Error(`bad category ${f.category}`);
    findings.push(f);
  };

  if (!KEY || KEY.includes("XXXX")) {
    console.error("IVY_API_KEY missing. Investigation will still emit structure with empty answers.");
  }

  // --- health ---
  const health = await ivy("/health", {}, "none");
  writeJson("discovery/health.json", health.json);
  const clock = str(asObj(health.json).server_time || asObj(health.json).time);
  if (clock && !clock.endsWith("Z") && /[+-]\d{2}:\d{2}$/.test(clock)) {
    add({
      endpoint: "/health",
      category: "timestamps",
      documented: "Timestamps are ISO 8601, UTC, Z suffix, everywhere in the API",
      actual: `Health clock uses an explicit IST offset, e.g. ${clock}`,
      how_found: "GET /health with no authentication before any other call",
      impact: "Any code that assumes Z/UTC will shift dates by 5.5 hours, which breaks listings_last_7_days if you mix sources",
      evidence: [],
    });
  }

  // --- auth: query vs header ---
  const viaQuery = await ivy("/v1/listings?limit=1", {}, "query");
  const viaHeader = await ivy("/v1/listings?limit=1", {}, "header");
  const none = await ivy("/v1/listings?limit=1", {}, "none");
  writeJson("discovery/auth.json", {
    query: { status: viaQuery.status, json: viaQuery.json },
    header: { status: viaHeader.status, json: viaHeader.json },
    none: { status: none.status, json: none.json },
  });
  if (viaQuery.status === 401) {
    add({
      endpoint: "*",
      category: "auth",
      documented: "Every request must carry the API key as a query parameter ?api_key=",
      actual: `The API rejects query-parameter keys (${viaQuery.status}: ${JSON.stringify(viaQuery.json)}) and requires the X-API-Key header instead`,
      how_found: "Called GET /v1/listings with api_key in the query string, then again with X-API-Key",
      impact: "A client that follows the docs cannot authenticate",
      evidence: [],
    });
  }

  // --- documented paths ---
  const documented = [
    "/auth/login",
    "/auth/logout",
    "/v1/listings",
    "/v1/listing/does-not-exist",
    "/v1/listings/does-not-exist/similar",
    "/v1/rentals",
    "/v1/rentals/does-not-exist",
    "/v1/projects",
    "/v1/projects/does-not-exist",
    "/v1/favourites",
    "/v1/analytics/summary",
    "/health",
  ];
  const discovery: Rec[] = [];
  for (const p of documented) {
    const method = p.includes("/auth/") ? "POST" : "GET";
    const r = await ivy(p, { method, body: method === "POST" ? JSON.stringify({}) : undefined, headers: { "Content-Type": "application/json" } });
    discovery.push({ path: p, method, status: r.status, json: r.json });
  }
  const extras = [
    "/v1/listings/does-not-exist",
    "/v1/analytics",
    "/v1/auth/login",
    "/docs",
    "/openapi.json",
    "/v1/summary",
  ];
  for (const p of extras) {
    const r = await ivy(p);
    discovery.push({ path: p, method: "GET", status: r.status, json: r.json });
  }
  writeJson("discovery/endpoints.json", discovery);

  const listingSingular = discovery.find((d) => d.path === "/v1/listing/does-not-exist");
  const listingPlural = discovery.find((d) => d.path === "/v1/listings/does-not-exist");
  if (listingSingular && listingSingular.status === 404 && listingPlural && listingPlural.status !== 404) {
    add({
      endpoint: "/v1/listing/{id}",
      category: "missing_endpoint",
      documented: "GET /v1/listing/{listing_id} returns a single listing",
      actual: `That path 404s (${listingSingular.status}). The working detail path is GET /v1/listings/{id} (status ${listingPlural.status} for a missing id, i.e. the route exists)`,
      how_found: "Probed both /v1/listing/{id} and /v1/listings/{id} with a fake id",
      impact: "Detail pages built from the docs fail",
      evidence: [],
    });
  }

  const analytics = discovery.find((d) => d.path === "/v1/analytics/summary");
  if (analytics && analytics.status === 404) {
    add({
      endpoint: "/v1/analytics/summary",
      category: "missing_endpoint",
      documented: "GET /v1/analytics/summary returns pre-computed aggregates",
      actual: `404 ${JSON.stringify(analytics.json)}`,
      how_found: "Called the documented analytics path",
      impact: "Insights screen cannot use the documented URL",
      evidence: [],
    });
  }

  if (!KEY || KEY.includes("XXXX")) {
    const answers = emptyAnswers();
    writeOutputs(answers, findings);
    console.log("Wrote empty submission scaffold (no API key).");
    return;
  }

  const listings = await fetchCollection("/v1/listings");
  const rentals = await fetchCollection("/v1/rentals");
  const projects = await fetchCollection("/v1/projects");

  // pagination documented vs actual
  const firstMeta = listings.pageMetas[0] ?? {};
  const documentedShape = ["total", "page", "page_size", "results"];
  const actualKeys = (firstMeta.keys as string[]) ?? [];
  if (actualKeys.includes("offset") || actualKeys.includes("has_more") || listings.mode === "offset") {
    add({
      endpoint: "/v1/listings",
      category: "pagination",
      documented: "Collection endpoints take page + limit and return { total, page, page_size, results }. Fetch every record by dividing total by limit.",
      actual: `Responses are offset-based. Echoed fields include ${JSON.stringify(firstMeta)}. Used ${listings.mode} pagination and retrieved ${listings.all.length} records by following has_more/offset, not documented page/total.`,
      how_found: "Fetched the first listings page and compared keys to the documented envelope, then paged until has_more was false",
      impact: "A client that stops after total/limit pages can miss or duplicate records",
      evidence: [],
    });
  }

  // documented "only active listings"
  const liveField = listings.all.filter((r) => r.is_live === true).length;
  const notLive = listings.all.filter((r) => r.is_live === false).length;
  if (notLive > 0) {
    add({
      endpoint: "/v1/listings",
      category: "completeness",
      documented: "GET /v1/listings returns active sale listings only; inactive/expired/withdrawn are excluded",
      actual: `${notLive} retrievable records have is_live=false (${liveField} have is_live=true) out of ${listings.all.length}`,
      how_found: "Paged every listing and counted is_live",
      impact: "Showing the endpoint as a public catalogue includes listings that should not be shown",
      evidence: listings.all.filter((r) => r.is_live === false).slice(0, 20).map(idOf),
    });
  }

  // unique listing_id
  const idCounts = new Map<string, number>();
  for (const r of listings.all) {
    const id = idOf(r);
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }
  const dupIds = [...idCounts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  if (dupIds.length) {
    add({
      endpoint: "/v1/listings",
      category: "duplicates",
      documented: "Every listing_id is globally unique, and each listing corresponds to exactly one physical property",
      actual: `${dupIds.length} listing_id values repeat across records`,
      how_found: "Counted listing_id frequencies after fetching every page",
      impact: "Deduplicating by listing_id under-counts properties",
      evidence: dupIds.slice(0, 20),
    });
  }

  // unique properties via fingerprint
  const byProp = new Map<string, Rec[]>();
  for (const r of listings.all) {
    const k = propertyKey(r);
    if (!byProp.has(k)) byProp.set(k, []);
    byProp.get(k)!.push(r);
  }
  const multi = [...byProp.entries()].filter(([, rows]) => rows.length > 1);
  if (multi.length && dupIds.length === 0) {
    add({
      endpoint: "/v1/listings",
      category: "duplicates",
      documented: "Each listing corresponds to exactly one physical property",
      actual: `${multi.length} distinct properties are described by more than one listing record (same identity key)`,
      how_found: "Grouped records by property_id if present, else listing_url, else apartment+locality+bedroom+floor+area+price+coords",
      impact: "Naively counting rows overstates inventory",
      evidence: multi.slice(0, 20).flatMap(([, rows]) => rows.map(idOf)).slice(0, 20),
    });
  }

  // filters
  const sampleLoc = str(listings.all[0]?.locality);
  if (sampleLoc) {
    const filtered = await ivy(`/v1/listings${q({ locality: sampleLoc, limit: 50, offset: 0 })}`);
    const rows = listOf(filtered.json);
    const mismatch = rows.filter((r) => str(r.locality).toLowerCase() !== sampleLoc.toLowerCase());
    if (mismatch.length) {
      add({
        endpoint: "/v1/listings",
        category: "filters",
        documented: "locality is an exact-match lowercase filter",
        actual: `Requested locality=${sampleLoc} but ${mismatch.length}/${rows.length} rows had a different locality`,
        how_found: `GET /v1/listings?locality=${sampleLoc}&limit=50`,
        impact: "Server-side locality filter cannot be trusted; the UI must filter client-side",
        evidence: mismatch.slice(0, 20).map(idOf),
      });
    }
    const bhkTest = await ivy(`/v1/listings${q({ bhk: 3, limit: 50, offset: 0 })}`);
    const bhkRows = listOf(bhkTest.json);
    const bhkMismatch = bhkRows.filter((r) => num(r.bedroom ?? r.bhk) !== 3);
    if (bhkRows.length && bhkMismatch.length) {
      add({
        endpoint: "/v1/listings",
        category: "filters",
        documented: "bhk filters by number of bedrooms",
        actual: `${bhkMismatch.length}/${bhkRows.length} rows returned for bhk=3 do not have bedroom=3 (parameter is accepted and ignored or mapped differently)`,
        how_found: "GET /v1/listings?bhk=3&limit=50 and compared bedroom field",
        impact: "Bedroom chips that rely on the server return mixed inventory",
        evidence: bhkMismatch.slice(0, 20).map(idOf),
      });
    }
    const furn = await ivy(`/v1/listings${q({ furnishing: "fully-furnished", limit: 50, offset: 0 })}`);
    const furnRows = listOf(furn.json);
    const furnMismatch = furnRows.filter((r) => str(r.furnishing).toLowerCase() !== "fully-furnished");
    if (furnRows.length && furnMismatch.length === furnRows.length) {
      add({
        endpoint: "/v1/listings",
        category: "filters",
        documented: "furnishing filter: unfurnished | semi-furnished | fully-furnished",
        actual: "All returned rows ignored the furnishing query parameter",
        how_found: "GET /v1/listings?furnishing=fully-furnished&limit=50",
        impact: "Furnishing filter must be applied in the application",
        evidence: furnMismatch.slice(0, 20).map(idOf),
      });
    }
    const minP = 50_000_000;
    const priceF = await ivy(`/v1/listings${q({ min_price: minP, limit: 50, offset: 0 })}`);
    const priceRows = listOf(priceF.json);
    const priceMismatch = priceRows.filter((r) => (num(r.price) ?? 0) < minP);
    if (priceRows.length && priceMismatch.length) {
      add({
        endpoint: "/v1/listings",
        category: "filters",
        documented: "min_price / max_price are inclusive rupee filters",
        actual: `${priceMismatch.length} rows under min_price=${minP} were still returned`,
        how_found: `GET /v1/listings?min_price=${minP}`,
        impact: "Price range UI that trusts the server is wrong",
        evidence: priceMismatch.slice(0, 20).map(idOf),
      });
    }
  }

  // sorting
  const sorted = await ivy(`/v1/listings${q({ sort_by: "price", order: "desc", limit: 20, offset: 0 })}`);
  const srows = listOf(sorted.json);
  const prices = srows.map((r) => num(r.price) ?? 0);
  const isDesc = prices.every((p, i) => i === 0 || prices[i - 1] >= p);
  if (srows.length >= 5 && !isDesc) {
    add({
      endpoint: "/v1/listings",
      category: "sorting",
      documented: "sort_by=price and order=desc sort listings by price descending",
      actual: `Returned prices were not descending: ${prices.slice(0, 8).join(", ")}`,
      how_found: "GET /v1/listings?sort_by=price&order=desc&limit=20",
      impact: "Sort controls that rely on the API show unsorted data",
      evidence: srows.slice(0, 20).map(idOf),
    });
  }

  // units: price per sqft sanity vs documented rupees + sqft
  const live2 = listings.all.filter((r) => r.is_live === true && num(r.bedroom ?? r.bhk) === 2);
  const unitSamples = live2
    .map((r) => ({ id: idOf(r), price: num(r.price), carpet: num(r.carpet_area), pps: ppsqft(r) }))
    .filter((x) => x.pps != null);
  const medianPps = median(unitSamples.map((x) => x.pps as number));
  // Bengaluru sale ppsqft typically 4k-20k INR if both are rupees and sqft.
  // If prices are in lakhs, pps would be ~50-200. If area is sqm, pps is inflated ~10x.
  if (medianPps && medianPps < 500) {
    add({
      endpoint: "/v1/listings",
      category: "units",
      documented: "Money is integer Indian rupees and area is integer square feet everywhere",
      actual: `Median price/carpet_area for live 2BHK is ${medianPps.toFixed(2)}, far below plausible ₹/sqft in this market — at least one of price or area is not in the documented unit`,
      how_found: "Computed price/carpet_area on live 2BHK records after a full pull",
      impact: "Insights and ₹/sqft displays will be off by a large factor if the docs are trusted",
      evidence: unitSamples.slice(0, 20).map((x) => x.id),
    });
  } else if (medianPps && medianPps > 80000) {
    add({
      endpoint: "/v1/listings",
      category: "units",
      documented: "Area is square feet integer everywhere",
      actual: `Median ₹/carpet_area for live 2BHK is ${medianPps.toFixed(2)}, consistent with carpet_area being in square metres (or price not in rupees)`,
      how_found: "Computed price/carpet_area on live 2BHK records after a full pull",
      impact: "Areas shown as sqft would be ~10.76× too small if they are actually sqm",
      evidence: unitSamples.slice(0, 20).map((x) => x.id),
    });
  }

  // timestamps on listings
  const posted = listings.all.map((r) => str(r.posted_at)).filter(Boolean);
  const nonZ = posted.filter((t) => t && !t.endsWith("Z")).slice(0, 20);
  if (nonZ.length) {
    add({
      endpoint: "/v1/listings",
      category: "timestamps",
      documented: "Timestamps are ISO 8601 UTC with a Z suffix everywhere",
      actual: `posted_at often uses a non-Z offset, e.g. ${nonZ[0]}`,
      how_found: "Inspected posted_at after downloading all listings",
      impact: "Date filters that assume UTC-Z mis-bucket listings_last_7_days",
      evidence: listings.all.filter((r) => str(r.posted_at) && !str(r.posted_at).endsWith("Z")).slice(0, 20).map(idOf),
    });
  }

  // lowercase strings
  const badCase = listings.all.filter((r) => {
    const loc = str(r.locality);
    const furn = str(r.furnishing);
    const pt = str(r.property_type);
    return (loc && loc !== loc.toLowerCase()) || (furn && furn !== furn.toLowerCase()) || (pt && pt !== pt.toLowerCase());
  });
  if (badCase.length) {
    add({
      endpoint: "/v1/listings",
      category: "data_quality",
      documented: "Strings are lowercase for locality, furnishing, property_type",
      actual: `${badCase.length} listings violate that convention`,
      how_found: "Compared fields to their toLowerCase() form",
      impact: "Exact-match lowercase filters miss records",
      evidence: badCase.slice(0, 20).map(idOf),
    });
  }

  // corrupt
  const corrupt = listings.all.filter((r) => isCorrupt(r));
  if (corrupt.length) {
    add({
      endpoint: "/v1/listings",
      category: "data_quality",
      documented: "Listing objects describe real apartments (floor, area, price, coordinates that can exist)",
      actual: `${corrupt.length} records fail physical-possibility checks (negative values, carpet>SBA, floor>total_floors, coordinates outside India, impossible BHK)`,
      how_found: "Applied deterministic integrity rules to every retrievable listing",
      impact: "These records must be excluded from averages (question 6) and should not be shown as-is",
      evidence: corrupt.map(idOf).sort().slice(0, 20),
    });
  }

  // fake
  const contactCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  for (const r of listings.all) {
    const c = str(r.posted_by_contact);
    const d = str(r.description).trim().toLowerCase();
    if (c) contactCounts.set(c, (contactCounts.get(c) ?? 0) + 1);
    if (d) descCounts.set(d, (descCounts.get(d) ?? 0) + 1);
  }
  const fakes = listings.all.filter((r) => looksFake(r, contactCounts, descCounts));
  if (fakes.length) {
    add({
      endpoint: "/v1/listings",
      category: "fraud",
      documented: "posted_by_contact is the seller's verified number; description is the seller's own text for a real listing",
      actual: `${fakes.length} records look like enquiry bait (shared contacts across many listings, cloned descriptions, or impossible ₹/sqft)`,
      how_found: "Counted contact and description reuse after a full pull; flagged extreme price/area ratios",
      impact: "These IDs belong in fake_listing_ids and must be excluded from the 2BHK average",
      evidence: fakes.map(idOf).sort().slice(0, 20),
    });
  }

  // project listing counts
  const listingsByProject = new Map<string, number>();
  for (const r of listings.all) {
    const pid = str(r.project_id);
    if (!pid || pid === "null") continue;
    listingsByProject.set(pid, (listingsByProject.get(pid) ?? 0) + 1);
  }
  const wrongProjects: string[] = [];
  for (const p of projects.all) {
    const pid = str(p.project_id);
    const reported = num(p.total_listings);
    const actual = listingsByProject.get(pid) ?? 0;
    if (reported != null && reported !== actual) wrongProjects.push(pid);
  }
  if (wrongProjects.length) {
    add({
      endpoint: "/v1/projects",
      category: "consistency",
      documented: "total_listings always agrees with GET /v1/listings?project_id=...",
      actual: `${wrongProjects.length} projects report a total_listings that does not match the number of retrievable listings with that project_id`,
      how_found: "Counted listings.project_id after a full pull and compared to each project's total_listings. Also probed project_id as a listings filter if present.",
      impact: "Project cards that show availability from total_listings are wrong",
      evidence: wrongProjects.slice(0, 20),
    });
  }

  const projFilter = projects.all[0] ? await ivy(`/v1/listings${q({ project_id: str(projects.all[0].project_id), limit: 5, offset: 0 })}`) : null;
  writeJson("discovery/project_id_filter.json", projFilter);

  // similar endpoint with a real id
  const anyId = idOf(listings.all[0] ?? {});
  if (anyId) {
    const simDoc = await ivy(`/v1/listings/${encodeURIComponent(anyId)}/similar`);
    const simAlt = await ivy(`/v1/listing/${encodeURIComponent(anyId)}/similar`);
    writeJson("discovery/similar.json", { simDoc, simAlt });
    if (simDoc.status === 404) {
      add({
        endpoint: "/v1/listings/{id}/similar",
        category: "missing_endpoint",
        documented: "GET /v1/listings/{listing_id}/similar returns up to ten comparable listings",
        actual: `404 ${JSON.stringify(simDoc.json)}; alternate /v1/listing/{id}/similar status=${simAlt.status}`,
        how_found: `Called similar with listing_id ${anyId}`,
        impact: "Similar strip cannot use the documented path",
        evidence: [anyId],
      });
    }
  }

  // analytics if it exists
  const summary = await ivy("/v1/analytics/summary");
  writeJson("discovery/analytics.json", summary.json);
  if (summary.status === 200) {
    const s = asObj(summary.json);
    if (typeof s.total_listings === "number" && s.total_listings !== listings.all.length) {
      add({
        endpoint: "/v1/analytics/summary",
        category: "consistency",
        documented: "total_listings is the city listing count",
        actual: `summary.total_listings=${s.total_listings} but ${listings.all.length} listing records are retrievable`,
        how_found: "Compared analytics.summary to a full listings pull",
        impact: "Dashboard totals disagree with the catalogue",
        evidence: [],
      });
    }
  }

  // rentals locality sum field
  const assigned = LOCALITY || mostCommon(rentals.all.map((r) => str(r.locality).toLowerCase()));
  const rentalInLoc = rentals.all.filter((r) => str(r.locality).toLowerCase() === assigned);

  const corruptIds = [...new Set(corrupt.map(idOf))].sort();
  const fakeIds = [...new Set(fakes.map(idOf))].sort();
  const exclude = new Set([...corruptIds, ...fakeIds]);

  const avgSet = listings.all.filter((r) => r.is_live === true && num(r.bedroom ?? r.bhk) === 2 && !exclude.has(idOf(r)));
  const ratios = avgSet.map(ppsqft).filter((x): x is number => x != null);
  const avg = ratios.length ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) / 100 : 0;

  const start = new Date(REFERENCE.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last7 = listings.all.filter((r) => {
    const t = Date.parse(str(r.posted_at));
    if (Number.isNaN(t)) return false;
    return t >= start.getTime() && t < REFERENCE.getTime();
  }).length;

  const costliest = projects.all.reduce<{ project_id: string; price_max_inr: number }>(
    (best, p) => {
      const mx = num(p.price_max) ?? 0;
      if (mx > best.price_max_inr) return { project_id: str(p.project_id), price_max_inr: mx };
      return best;
    },
    { project_id: "", price_max_inr: 0 },
  );

  const answers = {
    total_listing_records: listings.all.length,
    unique_properties: byProp.size,
    active_listings: listings.all.filter((r) => r.is_live === true).length,
    corrupt_listing_ids: corruptIds,
    total_monthly_rent: rentalInLoc.reduce((s, r) => s + (num(r.price) ?? 0), 0),
    avg_price_per_sqft_2bhk: avg,
    costliest_project: costliest,
    listings_last_7_days: last7,
    fake_listing_ids: fakeIds,
    projects_with_wrong_listing_count: wrongProjects.length,
  };

  writeJson("analysis/answers.internal.json", {
    assignedLocalityUsed: assigned,
    avgSetSize: avgSet.length,
    uniqueKeyNote: "property_id || listing_url || fingerprint",
    is_live_true: liveField,
    is_live_false: notLive,
  });

  writeOutputs(answers, findings);
  console.log("Investigation complete.");
  console.log(JSON.stringify(answers, null, 2));
  console.log(`findings: ${findings.length}`);
}

function mostCommon(items: string[]) {
  const m = new Map<string, number>();
  for (const i of items) if (i) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function median(ns: number[]) {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function emptyAnswers() {
  return {
    total_listing_records: 0,
    unique_properties: 0,
    active_listings: 0,
    corrupt_listing_ids: [] as string[],
    total_monthly_rent: 0,
    avg_price_per_sqft_2bhk: 0.0,
    costliest_project: { project_id: "", price_max_inr: 0 },
    listings_last_7_days: 0,
    fake_listing_ids: [] as string[],
    projects_with_wrong_listing_count: 0,
  };
}

function writeOutputs(answers: ReturnType<typeof emptyAnswers>, findings: Finding[]) {
  writeJson("output/answers.json", answers);
  writeJson("output/findings.json", findings);
  const submission = {
    api_key: KEY && !KEY.includes("XXXX") ? KEY : "IVY26-XXXXXXXXXXXX",
    candidate: {
      name: process.env.CANDIDATE_NAME ?? "",
      email: process.env.CANDIDATE_EMAIL ?? "",
      repo_url: process.env.CANDIDATE_REPO_URL ?? "",
      demo_url: process.env.CANDIDATE_DEMO_URL ?? "",
    },
    answers,
    findings,
  };
  fs.writeFileSync(path.join(root, "submission.json"), JSON.stringify(submission, null, 2));
  writeJson("output/submission.json", submission);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
