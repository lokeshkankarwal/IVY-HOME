import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { PropertyCard } from "../../components/PropertyCard";
import { useAuth } from "../../auth";
import type { Property, IvyListing } from "../../types";

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Filter states initialized from URL params
  const [locality, setLocality] = useState(searchParams.get("locality") || "");
  const [bhk, setBhk] = useState(searchParams.get("bhk") || "");
  const [propertyType, setPropertyType] = useState(searchParams.get("type") || "");
  const [furnishing, setFurnishing] = useState(searchParams.get("furnishing") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [sortBy, setSortBy] = useState("newest");
  const [sourceTab, setSourceTab] = useState<"all" | "ivy" | "platform">("all");

  const [platformProps, setPlatformProps] = useState<Property[]>([]);
  const [ivyListings, setIvyListings] = useState<IvyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [ivyError, setIvyError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Load data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Fetch local platform properties
    const fetchPlatform = api
      .get<{ results: Property[] }>("/properties?limit=100")
      .then((d) => (isMounted ? setPlatformProps(d.results || []) : null))
      .catch(() => (isMounted ? setPlatformProps([]) : null));

    // Fetch Ivy API listings
    const fetchIvy = api
      .get<{ results?: IvyListing[]; listings?: IvyListing[] }>("/ivy/listings?limit=100")
      .then((d) => {
        if (!isMounted) return;
        const list = d.results || d.listings || [];
        setIvyListings(list);
        setIvyError(null);
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setIvyError(err.message || "Ivy API offline");
      });

    Promise.allSettled([fetchPlatform, fetchIvy]).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update URL search params
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (locality) params.set("locality", locality);
    if (bhk) params.set("bhk", bhk);
    if (propertyType) params.set("type", propertyType);
    if (furnishing) params.set("furnishing", furnishing);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    setSearchParams(params);
    setPage(1);
  };

  const clearFilters = () => {
    setLocality("");
    setBhk("");
    setPropertyType("");
    setFurnishing("");
    setMinPrice("");
    setMaxPrice("");
    setSearchParams(new URLSearchParams());
    setPage(1);
  };

  // Convert and normalize items
  // Convert and normalize items
  type NormalizedItem = {
    id: string;
    title: string;
    price: number;
    locality: string;
    city?: string;
    address?: string;
    projectName?: string;
    bhk: number;
    area: number;
    image?: string;
    href: string;
    latitude: number;
    longitude: number;
    furnishing: string;
    propertyType: string;
    isSold: boolean;
    source: "ivy" | "platform";
    listingType?: string;
  };

  const normalizedItems: NormalizedItem[] = useMemo(() => {
    const list: NormalizedItem[] = [];

    // Platform properties (only show BUY or default on Buy page)
    if (sourceTab === "all" || sourceTab === "platform") {
      platformProps
        .filter((p) => (p.listingType || "BUY") === "BUY")
        .forEach((p) => {
          list.push({
            id: p.id,
            title: p.title,
            price: p.price,
            locality: p.locality,
            city: p.city || "Bengaluru",
            address: p.address,
            projectName: p.projectName,
            bhk: p.bhk,
            area: p.carpetArea,
            image: p.primaryImage,
            href: `/properties/${p.id}`,
            latitude: p.latitude,
            longitude: p.longitude,
            furnishing: p.furnishing.toLowerCase(),
            propertyType: p.propertyType.toLowerCase(),
            isSold: p.status === "SOLD",
            source: "platform",
            listingType: p.listingType || "BUY",
          });
        });
    }

    // Ivy listings
    if (sourceTab === "all" || sourceTab === "ivy") {
      ivyListings.forEach((iv) => {
        list.push({
          id: iv.listing_id,
          title: iv.apartment_name
            ? `${iv.bedroom} BHK in ${iv.apartment_name}`
            : `${iv.bedroom} BHK ${iv.property_type || "Apartment"} in ${iv.locality}`,
          price: iv.price,
          locality: iv.locality,
          city: "Bengaluru",
          address: iv.apartment_name ? `${iv.apartment_name}, ${iv.locality}` : iv.locality,
          projectName: iv.apartment_name,
          bhk: iv.bedroom,
          area: iv.carpet_area,
          image: "/defaults/apartment.svg",
          href: `/properties/${iv.listing_id}`,
          latitude: iv.latitude,
          longitude: iv.longitude,
          furnishing: (iv.furnishing || "").toLowerCase(),
          propertyType: (iv.property_type || "").toLowerCase(),
          isSold: false,
          source: "ivy",
          listingType: "BUY",
        });
      });
    }

    return list;
  }, [platformProps, ivyListings, sourceTab]);

  // Client-side filtering with broad district/locality/city/address matching
  const filteredItems = useMemo(() => {
    return normalizedItems.filter((item) => {
      if (locality) {
        const needle = locality.toLowerCase().trim();
        const loc = (item.locality || "").toLowerCase();
        const city = (item.city || "").toLowerCase();
        const addr = (item.address || "").toLowerCase();
        const proj = (item.projectName || "").toLowerCase();
        const title = (item.title || "").toLowerCase();
        const matches =
          loc.includes(needle) ||
          city.includes(needle) ||
          addr.includes(needle) ||
          proj.includes(needle) ||
          title.includes(needle);
        if (!matches) return false;
      }
      if (bhk) {
        if (item.bhk !== Number(bhk)) return false;
      }
      if (furnishing) {
        const f = item.furnishing.toLowerCase().replace(/_/g, "-");
        const target = furnishing.toLowerCase().replace(/_/g, "-");
        if (!f.includes(target)) return false;
      }
      if (propertyType) {
        const pt = item.propertyType.toLowerCase().replace(/_/g, " ");
        const target = propertyType.toLowerCase().replace(/_/g, " ");
        if (!pt.includes(target)) return false;
      }
      if (minPrice && item.price < Number(minPrice)) return false;
      if (maxPrice && item.price > Number(maxPrice)) return false;
      return true;
    });
  }, [normalizedItems, locality, bhk, furnishing, propertyType, minPrice, maxPrice]);

  // Autocomplete suggestions based on available listings
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationSuggestions = useMemo(() => {
    if (!locality || locality.trim().length === 0) return [];
    const needle = locality.toLowerCase().trim();
    const suggestions = new Set<string>();

    normalizedItems.forEach((item) => {
      const parts = [item.locality, item.city, item.address].filter(Boolean);
      const full = parts.join(", ");
      if (full.toLowerCase().includes(needle)) {
        suggestions.add(full);
      } else {
        if (item.locality && item.locality.toLowerCase().includes(needle)) suggestions.add(item.locality);
        if (item.city && item.city.toLowerCase().includes(needle)) suggestions.add(item.city);
      }
      if (item.projectName && item.projectName.toLowerCase().includes(needle)) {
        suggestions.add(`${item.projectName} (${item.locality})`);
      }
    });

    return Array.from(suggestions).slice(0, 6);
  }, [normalizedItems, locality]);

  // Sorting
  const sortedItems = useMemo(() => {
    const copy = [...filteredItems];
    if (sortBy === "price_asc") copy.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") copy.sort((a, b) => b.price - a.price);
    else if (sortBy === "area_desc") copy.sort((a, b) => b.area - a.area);
    return copy;
  }, [filteredItems, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

  const handleFav = async (item: NormalizedItem) => {
    if (!user) {
      setActionMsg("Please log in to save favourites.");
      setTimeout(() => setActionMsg(null), 3000);
      return;
    }
    try {
      if (item.source === "ivy") {
        await api.post("/ivy/favourites", { id: item.id });
      } else {
        await api.post("/favourites", { propertyId: item.id });
      }
      setActionMsg(`Saved "${item.title}" to favourites!`);
      setTimeout(() => setActionMsg(null), 3000);
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "Failed to save favourite");
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleCart = async (item: NormalizedItem) => {
    if (!user) {
      setActionMsg("Please log in to add to cart.");
      setTimeout(() => setActionMsg(null), 3000);
      return;
    }
    if (item.source === "ivy") {
      setActionMsg("Ivy MLS listings can be saved to favourites and inquired via contact.");
      setTimeout(() => setActionMsg(null), 3000);
      return;
    }
    try {
      await api.post("/cart", { propertyId: item.id });
      setActionMsg(`Added "${item.title}" to your cart!`);
      setTimeout(() => setActionMsg(null), 3000);
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "Failed to add to cart");
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Properties for Sale</h1>
          <p className="text-sm text-ink/70">
            {sortedItems.length} properties matching criteria across Bengaluru
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Source Filter */}
          <div className="flex rounded-xl bg-ink/5 p-1 text-xs font-semibold">
            <button
              onClick={() => {
                setSourceTab("all");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                sourceTab === "all" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
              }`}
            >
              All ({platformProps.length + ivyListings.length})
            </button>
            <button
              onClick={() => {
                setSourceTab("ivy");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                sourceTab === "ivy" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
              }`}
            >
              Ivy MLS ({ivyListings.length})
            </button>
            <button
              onClick={() => {
                setSourceTab("platform");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                sourceTab === "platform" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
              }`}
            >
              Platform ({platformProps.length})
            </button>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-xl bg-moss/10 border border-moss/20 px-4 py-2 text-sm text-moss font-semibold animate-fade-in">
          {actionMsg}
        </div>
      )}

      {ivyError && sourceTab !== "platform" && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900">
          <span className="font-bold">Note on Ivy API:</span> {ivyError}. Showing platform verified listings. Add your
          IVY_API_KEY in .env to pull real-time city MLS data.
        </div>
      )}

      {/* Filter Bar */}
      <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative">
            <input
              type="text"
              placeholder="District / Locality (e.g. Jagatpura, Whitefield)"
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
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
          >
            <option value="">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="independent house">Independent House</option>
            <option value="plot">Plot</option>
            <option value="builder floor">Builder Floor</option>
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
            placeholder="Min Price (₹)"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
          />

          <input
            type="number"
            placeholder="Max Price (₹)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/5 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-ink/60 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-ink/10 bg-sand/30 px-2.5 py-1 text-xs"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="area_desc">Carpet Area: Large to Small</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="rounded-lg bg-ink px-4 py-1.5 font-semibold text-sand hover:bg-ink/90"
            >
              Apply Filters
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

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading properties...</div>
      ) : sortedItems.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-12 text-center text-ink/60">
          No properties match your active filters. Try clearing or adjusting the filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((item) => (
              <PropertyCard
                key={item.id}
                id={item.id}
                title={item.title}
                price={item.price}
                locality={item.locality}
                bhk={item.bhk}
                area={item.area}
                image={item.image}
                href={item.href}
                sold={item.isSold}
                onFav={user?.role === "SELLER" ? undefined : () => void handleFav(item)}
                onCart={user?.role === "SELLER" || item.isSold || item.source !== "platform" ? undefined : () => void handleCart(item)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
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
