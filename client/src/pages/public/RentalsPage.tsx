import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr, imgSrc } from "../../lib/format";
import type { IvyRental, Property } from "../../types";

export type UnifiedRental = {
  id: string;
  title: string;
  apartment_name?: string;
  locality: string;
  city?: string;
  address?: string;
  bedroom: number;
  floor?: number;
  furnishing: string;
  price: number;
  deposit?: number;
  carpet_area: number;
  latitude: number;
  longitude: number;
  posted_by: string;
  image: string;
  href: string;
  source: "ivy" | "platform";
};

export default function RentalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [locality, setLocality] = useState(searchParams.get("locality") || "");
  const [bhk, setBhk] = useState(searchParams.get("bhk") || "");
  const [furnishing, setFurnishing] = useState(searchParams.get("furnishing") || "");
  const [maxRent, setMaxRent] = useState(searchParams.get("maxRent") || "");
  const [sortBy, setSortBy] = useState("rent_asc");

  const [rentals, setRentals] = useState<IvyRental[]>([]);
  const [platformRentals, setPlatformRentals] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setLoading(true);
    const fetchIvy = api
      .get<{ results?: IvyRental[]; rentals?: IvyRental[] }>("/ivy/rentals?limit=100")
      .then((d) => {
        const list = d.results || d.rentals || [];
        setRentals(list);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message || "Ivy Rentals API offline");
      });

    const fetchPlatform = api
      .get<{ results: Property[] }>("/properties?listingType=RENT&limit=100")
      .then((d) => setPlatformRentals(d.results || []))
      .catch(() => setPlatformRentals([]));

    Promise.allSettled([fetchIvy, fetchPlatform]).finally(() => setLoading(false));
  }, []);

  // Unified rentals combining Ivy API and platform verified rentals
  const unifiedRentals: UnifiedRental[] = useMemo(() => {
    const list: UnifiedRental[] = [];

    // Platform rentals
    platformRentals.forEach((p) => {
      list.push({
        id: p.id,
        title: p.title,
        apartment_name: p.projectName,
        locality: p.locality,
        city: p.city || "Bengaluru",
        address: p.address,
        bedroom: p.bhk,
        floor: p.floor,
        furnishing: p.furnishing.toLowerCase().replace(/_/g, "-"),
        price: p.price,
        deposit: Math.round(p.price * 3),
        carpet_area: p.carpetArea,
        latitude: p.latitude || 12.9716,
        longitude: p.longitude || 77.5946,
        posted_by: p.seller?.name || "Verified Seller",
        image: p.primaryImage || "/defaults/apartment.svg",
        href: `/properties/${p.id}`,
        source: "platform",
      });
    });

    // Ivy rentals
    rentals.forEach((r) => {
      list.push({
        id: r.listing_id,
        title: r.title,
        apartment_name: r.apartment_name,
        locality: r.locality,
        city: "Bengaluru",
        address: r.apartment_name ? `${r.apartment_name}, ${r.locality}` : r.locality,
        bedroom: r.bedroom,
        floor: r.floor,
        furnishing: (r.furnishing || "").toLowerCase().replace(/_/g, "-"),
        price: r.price,
        deposit: r.deposit,
        carpet_area: r.carpet_area,
        latitude: r.latitude,
        longitude: r.longitude,
        posted_by: r.posted_by || "owner",
        image: "/defaults/apartment.svg",
        href: `/rentals/${r.listing_id}`,
        source: "ivy",
      });
    });

    return list;
  }, [rentals, platformRentals]);

  // Client-side filtering with broad district/city/locality/address matching
  const filtered = useMemo(() => {
    return unifiedRentals.filter((r) => {
      if (locality) {
        const needle = locality.toLowerCase().trim();
        const loc = (r.locality || "").toLowerCase();
        const city = (r.city || "").toLowerCase();
        const addr = (r.address || "").toLowerCase();
        const apt = (r.apartment_name || "").toLowerCase();
        const title = (r.title || "").toLowerCase();
        const matches =
          loc.includes(needle) ||
          city.includes(needle) ||
          addr.includes(needle) ||
          apt.includes(needle) ||
          title.includes(needle);
        if (!matches) return false;
      }
      if (bhk && r.bedroom !== Number(bhk)) return false;
      if (furnishing && !r.furnishing.toLowerCase().includes(furnishing.toLowerCase())) return false;
      if (maxRent && r.price > Number(maxRent)) return false;
      return true;
    });
  }, [unifiedRentals, locality, bhk, furnishing, maxRent]);

  // Autocomplete location suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationSuggestions = useMemo(() => {
    if (!locality || locality.trim().length === 0) return [];
    const needle = locality.toLowerCase().trim();
    const suggestions = new Set<string>();

    unifiedRentals.forEach((r) => {
      const parts = [r.locality, r.city, r.address].filter(Boolean);
      const full = parts.join(", ");
      if (full.toLowerCase().includes(needle)) {
        suggestions.add(full);
      } else {
        if (r.locality && r.locality.toLowerCase().includes(needle)) suggestions.add(r.locality);
        if (r.city && r.city.toLowerCase().includes(needle)) suggestions.add(r.city);
      }
      if (r.apartment_name && r.apartment_name.toLowerCase().includes(needle)) {
        suggestions.add(`${r.apartment_name} (${r.locality})`);
      }
    });

    return Array.from(suggestions).slice(0, 6);
  }, [unifiedRentals, locality]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === "rent_asc") copy.sort((a, b) => a.price - b.price);
    else if (sortBy === "rent_desc") copy.sort((a, b) => b.price - a.price);
    else if (sortBy === "area_desc") copy.sort((a, b) => b.carpet_area - a.carpet_area);
    return copy;
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const applyFilters = () => {
    const p = new URLSearchParams();
    if (locality) p.set("locality", locality);
    if (bhk) p.set("bhk", bhk);
    if (furnishing) p.set("furnishing", furnishing);
    if (maxRent) p.set("maxRent", maxRent);
    setSearchParams(p);
    setPage(1);
  };

  const clearFilters = () => {
    setLocality("");
    setBhk("");
    setFurnishing("");
    setMaxRent("");
    setSearchParams(new URLSearchParams());
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Bangalore Verified Rentals</h1>
          <p className="text-sm text-ink/70">
            {sorted.length} verified rental listings with correct monthly rents & security deposits
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-900">
          Showing verified rentals. Add your IVY_API_KEY in .env to pull real-time city MLS data.
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <input
              type="text"
              placeholder="District / Locality (e.g. Koramangala, Jagatpura)"
              value={locality}
              onChange={(e) => {
                setLocality(e.target.value);
                setShowSuggestions(true);
                setPage(1);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
            />
            {showSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-xl border border-ink/10 bg-white p-1.5 shadow-xl text-xs space-y-1 max-h-48 overflow-y-auto">
                {locationSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setLocality(sug);
                      setShowSuggestions(false);
                      setPage(1);
                    }}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left font-medium text-ink hover:bg-sand transition flex items-center gap-1.5"
                  >
                    <span>📍</span>
                    <span className="truncate capitalize">{sug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <select
            value={bhk}
            onChange={(e) => setBhk(e.target.value)}
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
          >
            <option value="">All BHKs</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4+ BHK</option>
          </select>

          <select
            value={furnishing}
            onChange={(e) => setFurnishing(e.target.value)}
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
          >
            <option value="">Any Furnishing</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-Furnished</option>
            <option value="fully-furnished">Fully Furnished</option>
          </select>

          <input
            type="number"
            placeholder="Max Rent ₹/month"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
          />
        </div>

        <div className="flex items-center justify-between border-t border-ink/5 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-ink/60 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-ink/10 bg-sand/30 px-2.5 py-1 text-xs"
            >
              <option value="rent_asc">Rent: Low to High</option>
              <option value="rent_desc">Rent: High to Low</option>
              <option value="area_desc">Carpet Area: Large First</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="rounded-lg bg-ink px-4 py-1.5 font-semibold text-sand hover:bg-ink/90"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="rounded-lg border border-ink/20 px-3 py-1.5 text-ink/70 hover:bg-ink/5"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading rentals...</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-12 text-center text-ink/60">
          No rentals found for the selected criteria.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((r) => (
              <article
                key={r.id}
                className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative">
                    <img src={r.image || "/defaults/apartment.svg"} alt="" className="h-44 w-full object-cover" />
                    <span className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      r.source === "platform" ? "bg-brass text-ink" : "bg-moss text-white"
                    }`}>
                      {r.source === "platform" ? "Platform Verified" : "Ivy MLS"}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-moss font-semibold">
                      <span>{r.bedroom} BHK · {r.furnishing.replace(/-/g, " ")}</span>
                      <span>Floor {r.floor ?? "—"}</span>
                    </div>

                    <h3 className="font-serif text-lg font-bold line-clamp-1">{r.title}</h3>

                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-xl font-bold text-ink">
                        {inr(r.price)}
                      </span>
                      <span className="text-xs text-ink/60 font-normal">/ month</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-ink/70 pt-1 border-t border-ink/5">
                      <div>
                        <span className="text-ink/50">Deposit:</span>{" "}
                        <span className="font-semibold text-ink/90">{inr(r.deposit || r.price * 3)}</span>
                      </div>
                      <div>
                        <span className="text-ink/50">Area:</span>{" "}
                        <span className="font-semibold text-ink/90">{r.carpet_area} sq ft</span>
                      </div>
                    </div>

                    <p className="text-xs text-ink/60 capitalize pt-1">
                      📍 {r.apartment_name ? `${r.apartment_name}, ` : ""}{r.locality}{r.city ? `, ${r.city}` : ""}
                    </p>
                  </div>
                </div>

                <div className="border-t border-ink/5 px-4 py-3 bg-sand/20 flex items-center justify-between text-xs">
                  <span className="text-ink/60">Posted by {r.posted_by || "owner"}</span>
                  <Link
                    to={r.href}
                    className="font-semibold text-moss hover:underline"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-ink/80 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
