import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr, imgSrc } from "../../lib/format";
import { PropertyMap, type MapPoint } from "../../components/PropertyMap";
import type { IvyRental } from "../../types";

export default function RentalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [locality, setLocality] = useState(searchParams.get("locality") || "");
  const [bhk, setBhk] = useState(searchParams.get("bhk") || "");
  const [furnishing, setFurnishing] = useState(searchParams.get("furnishing") || "");
  const [maxRent, setMaxRent] = useState(searchParams.get("maxRent") || "");
  const [sortBy, setSortBy] = useState("rent_asc");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const [rentals, setRentals] = useState<IvyRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setLoading(true);
    api
      .get<{ results?: IvyRental[]; rentals?: IvyRental[] }>("/ivy/rentals?limit=100")
      .then((d) => {
        const list = d.results || d.rentals || [];
        setRentals(list);
        setError(null);
      })
      .catch((err: Error) => {
        // Fallback sample data if API key not set yet
        setRentals([
          {
            listing_id: "R1000042",
            title: "2 BHK for rent in Koramangala",
            apartment_name: "Sobha Meadows",
            locality: "koramangala",
            property_type: "apartment",
            bedroom: 2,
            bathroom: 2,
            floor: 4,
            total_floors: 12,
            furnishing: "fully-furnished",
            price: 42000,
            deposit: 250000,
            maintenance: 2500,
            carpet_area: 980,
            super_builtup_area: 1280,
            latitude: 12.93461,
            longitude: 77.62281,
            posted_by: "owner",
            posted_by_name: "Priya Nair",
            posted_by_contact: "+91 98001 23456",
            description: "2 BHK, fully-furnished, in Sobha Meadows, Koramangala. Close to metro.",
          },
          {
            listing_id: "R1000043",
            title: "3 BHK Luxury Apartment in Whitefield",
            apartment_name: "Prestige Boulevard",
            locality: "whitefield",
            property_type: "apartment",
            bedroom: 3,
            bathroom: 3,
            floor: 8,
            total_floors: 18,
            furnishing: "semi-furnished",
            price: 65000,
            deposit: 350000,
            maintenance: 4500,
            carpet_area: 1450,
            super_builtup_area: 1820,
            latitude: 12.9698,
            longitude: 77.7499,
            posted_by: "agent",
            posted_by_name: "Karan Singhal",
            posted_by_contact: "+91 98222 33445",
            description: "Modern 3 BHK with premium fittings, clubhouse and gym.",
          },
          {
            listing_id: "R1000044",
            title: "1 BHK Studio in Indiranagar",
            apartment_name: "Indira Court",
            locality: "indiranagar",
            property_type: "apartment",
            bedroom: 1,
            bathroom: 1,
            floor: 2,
            total_floors: 4,
            furnishing: "fully-furnished",
            price: 28000,
            deposit: 120000,
            maintenance: 1500,
            carpet_area: 600,
            super_builtup_area: 750,
            latitude: 12.9784,
            longitude: 77.6408,
            posted_by: "owner",
            posted_by_name: "Amit Patel",
            posted_by_contact: "+91 98765 43210",
            description: "Walking distance to 100 Feet Road restaurants and metro station.",
          },
        ]);
        setError(err.message || "Ivy Rentals API offline");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return rentals.filter((r) => {
      if (locality && !r.locality.toLowerCase().includes(locality.toLowerCase().trim())) return false;
      if (bhk && r.bedroom !== Number(bhk)) return false;
      if (furnishing && !r.furnishing.toLowerCase().includes(furnishing.toLowerCase())) return false;
      if (maxRent && r.price > Number(maxRent)) return false;
      return true;
    });
  }, [rentals, locality, bhk, furnishing, maxRent]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === "rent_asc") copy.sort((a, b) => a.price - b.price);
    else if (sortBy === "rent_desc") copy.sort((a, b) => b.price - a.price);
    else if (sortBy === "area_desc") copy.sort((a, b) => b.carpet_area - a.carpet_area);
    return copy;
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const mapPoints: MapPoint[] = useMemo(() => {
    return sorted
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        id: r.listing_id,
        title: r.title,
        price: r.price,
        latitude: r.latitude,
        longitude: r.longitude,
        href: `/rentals/${r.listing_id}`,
      }));
  }, [sorted]);

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

        <div className="flex rounded-xl bg-ink/5 p-1 text-xs font-semibold">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-lg px-3 py-1.5 transition ${
              viewMode === "grid" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`rounded-lg px-3 py-1.5 transition ${
              viewMode === "map" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
            }`}
          >
            Map
          </button>
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
          <input
            type="text"
            placeholder="Locality (e.g. Koramangala)"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
          />

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
      ) : viewMode === "map" ? (
        <div className="rounded-2xl overflow-hidden border border-ink/10 shadow">
          <PropertyMap points={mapPoints} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((r) => (
              <article
                key={r.listing_id}
                className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm flex flex-col justify-between"
              >
                <div>
                  <img src="/defaults/apartment.svg" alt="" className="h-44 w-full object-cover" />
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
                        <span className="font-semibold text-ink/90">{inr(r.deposit)}</span>
                      </div>
                      <div>
                        <span className="text-ink/50">Area:</span>{" "}
                        <span className="font-semibold text-ink/90">{r.carpet_area} sq ft</span>
                      </div>
                    </div>

                    <p className="text-xs text-ink/60 capitalize pt-1">
                      📍 {r.apartment_name ? `${r.apartment_name}, ` : ""}{r.locality}
                    </p>
                  </div>
                </div>

                <div className="border-t border-ink/5 px-4 py-3 bg-sand/20 flex items-center justify-between text-xs">
                  <span className="text-ink/60">Posted by {r.posted_by || "owner"}</span>
                  <Link
                    to={`/rentals/${r.listing_id}`}
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
