import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { PropertyCard } from "../../components/PropertyCard";
import { inr } from "../../lib/format";
import type { Property } from "../../types";

export default function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<Property[]>([]);
  const [locality, setLocality] = useState("");
  const [bhk, setBhk] = useState("");
  const [type, setType] = useState("buy");

  useEffect(() => {
    api
      .get<{ results: Property[] }>("/properties?limit=6")
      .then((d) => setFeatured(d.results || []))
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "rent") {
      const q = new URLSearchParams();
      if (locality) q.set("locality", locality);
      if (bhk) q.set("bhk", bhk);
      navigate(`/rentals?${q.toString()}`);
    } else {
      const q = new URLSearchParams();
      if (locality) q.set("locality", locality);
      if (bhk) q.set("bhk", bhk);
      navigate(`/properties?${q.toString()}`);
    }
  };

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#1c3854] to-ink px-6 py-20 text-white shadow-xl sm:px-12 md:py-28">
        <div className="relative z-10 mx-auto max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-sand/10 px-4 py-1.5 text-xs tracking-wider uppercase text-brass">
            Bengaluru Verified Real Estate Platform
          </div>
          <h1 className="font-serif text-4xl font-normal tracking-tight sm:text-5xl md:text-6xl text-sand">
            Find your home with verified accuracy.
          </h1>
          <p className="text-base text-sand/80 sm:text-lg">
            Direct builder projects, vetted resale homes, and authentic rental listings across Bengaluru.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 flex flex-col gap-3 rounded-2xl bg-sand p-3 text-ink shadow-2xl sm:flex-row sm:items-center"
          >
            <div className="flex rounded-xl bg-ink/5 p-1">
              <button
                type="button"
                onClick={() => setType("buy")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  type === "buy" ? "bg-ink text-sand shadow" : "text-ink/70 hover:text-ink"
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setType("rent")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  type === "rent" ? "bg-ink text-sand shadow" : "text-ink/70 hover:text-ink"
                }`}
              >
                Rent
              </button>
            </div>

            <input
              type="text"
              placeholder="Locality (e.g. Whitefield, Koramangala)"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="flex-1 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
            />

            <select
              value={bhk}
              onChange={(e) => setBhk(e.target.value)}
              className="rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
            >
              <option value="">Any BHK</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4+ BHK</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-brass px-6 py-2.5 font-semibold text-ink transition hover:bg-brass/90"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Value Props */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="mb-3 text-2xl font-serif text-moss">01</div>
          <h3 className="font-serif text-lg font-bold">Verified Pricing & Area</h3>
          <p className="mt-1 text-sm text-ink/70">
            Transparent carpet area and verified super built-up numbers, eliminating broker inflation.
          </p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="mb-3 text-2xl font-serif text-brass">02</div>
          <h3 className="font-serif text-lg font-bold">Strict Ownership & Roles</h3>
          <p className="mt-1 text-sm text-ink/70">
            Vetted sellers, background-checked listings, and strict Superadmin sold status controls.
          </p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="mb-3 text-2xl font-serif text-ink">03</div>
          <h3 className="font-serif text-lg font-bold">Deep Market Insights</h3>
          <p className="mt-1 text-sm text-ink/70">
            Real market analytics, data discrepancy audits, and accurate ₹/sqft across Bangalore micro-markets.
          </p>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold sm:text-3xl">Featured Properties</h2>
            <p className="mt-1 text-sm text-ink/70">Recently verified homes ready for inspection</p>
          </div>
          <Link to="/properties" className="text-sm font-semibold text-moss hover:underline">
            View all properties &rarr;
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PropertyCard
                key={p.id}
                id={p.id}
                title={p.title}
                price={p.price}
                locality={p.locality}
                bhk={p.bhk}
                area={p.carpetArea}
                image={p.primaryImage}
                sold={p.status === "SOLD"}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-ink/60">
            Browse our complete catalogue under <Link to="/properties" className="text-moss underline">Buy</Link>.
          </div>
        )}
      </section>

      {/* Project & Rental Discovery Banner */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-ink/10 bg-gradient-to-br from-sand to-amber-50/50 p-8">
          <span className="text-xs uppercase tracking-wider text-moss font-bold">Builder Direct</span>
          <h3 className="mt-2 font-serif text-2xl font-bold">Explore Premium Projects</h3>
          <p className="mt-2 text-sm text-ink/70">
            Prestige, Sobha, Brigade, and Godrej developments with RERA registration and accurate floor plans.
          </p>
          <Link
            to="/projects"
            className="mt-6 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-sand hover:bg-ink/90"
          >
            Browse Projects &rarr;
          </Link>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-gradient-to-br from-sand to-emerald-50/50 p-8">
          <span className="text-xs uppercase tracking-wider text-moss font-bold">Zero Brokerage</span>
          <h3 className="mt-2 font-serif text-2xl font-bold">Curated Bangalore Rentals</h3>
          <p className="mt-2 text-sm text-ink/70">
            Furnished & semi-furnished apartments in Koramangala, Whitefield, Indiranagar, and HSR Layout.
          </p>
          <Link
            to="/rentals"
            className="mt-6 inline-block rounded-xl bg-moss px-5 py-2.5 text-sm font-semibold text-white hover:bg-moss/90"
          >
            Browse Rentals &rarr;
          </Link>
        </div>
      </section>

      {/* Insights teaser */}
      <section className="rounded-3xl border border-ink/10 bg-white p-8 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h3 className="font-serif text-2xl font-bold">Market Intelligence & Data Investigation</h3>
          <p className="text-sm text-ink/70 max-w-2xl">
            See the full audit of Bangalore real estate numbers: median prices, ₹/sqft per locality, and the 10 core assignment findings.
          </p>
        </div>
        <Link
          to="/insights"
          className="whitespace-nowrap rounded-xl border-2 border-ink px-6 py-3 font-semibold text-ink hover:bg-ink hover:text-sand transition"
        >
          View Market Insights &rarr;
        </Link>
      </section>
    </div>
  );
}
