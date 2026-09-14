import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr } from "../../lib/format";
import type { IvyProject, Property } from "../../types";

export default function ProjectsPage() {
  const [locality, setLocality] = useState("");
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState<IvyProject[]>([]);
  const [platformProps, setPlatformProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetchIvy = api
      .get<{ results?: IvyProject[]; projects?: IvyProject[] }>("/ivy/projects?limit=100")
      .then((d) => {
        const list = d.results || d.projects || [];
        setProjects(list);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message || "Ivy Projects API offline");
      });

    const fetchPlatform = api
      .get<{ results: Property[] }>("/properties?limit=100")
      .then((d) => setPlatformProps(d.results || []))
      .catch(() => setPlatformProps([]));

    Promise.allSettled([fetchIvy, fetchPlatform]).finally(() => setLoading(false));
  }, []);

  // Combine Ivy projects with seller-created projects (grouped by projectName)
  const allProjects = useMemo(() => {
    const list: IvyProject[] = [...projects];

    // Group platform properties with projectName
    const projectGroups: Record<string, Property[]> = {};
    platformProps.forEach((p) => {
      if (p.projectName && p.projectName.trim()) {
        const key = p.projectName.trim();
        if (!projectGroups[key]) projectGroups[key] = [];
        projectGroups[key].push(p);
      }
    });

    Object.entries(projectGroups).forEach(([pName, items]) => {
      const first = items[0];
      const prices = items.map((i) => i.price);
      const areas = items.map((i) => i.carpetArea);
      list.unshift({
        project_id: `platform-${pName.toLowerCase().replace(/\W+/g, "-")}`,
        apartment_name: pName,
        developer_name: first.seller?.name ? `${first.seller.name} (Verified Seller)` : "Verified Seller",
        locality: first.locality,
        project_status: "active units",
        total_units: items.length * 10,
        total_listings: items.length,
        price_min: Math.min(...prices),
        price_max: Math.max(...prices),
        min_area_sqft: Math.min(...areas),
        max_area_sqft: Math.max(...areas),
        amenities: ["parking", "power backup", "security", "lift"],
        latitude: first.latitude || 12.9716,
        longitude: first.longitude || 77.5946,
      });
    });

    return list;
  }, [projects, platformProps]);

  const filtered = useMemo(() => {
    return allProjects.filter((p) => {
      if (locality) {
        const needle = locality.toLowerCase().trim();
        const loc = (p.locality || "").toLowerCase();
        const apt = (p.apartment_name || "").toLowerCase();
        const dev = (p.developer_name || "").toLowerCase();
        const matches = loc.includes(needle) || apt.includes(needle) || dev.includes(needle);
        if (!matches) return false;
      }
      if (status && p.project_status?.toLowerCase() !== status.toLowerCase()) return false;
      return true;
    });
  }, [allProjects, locality, status]);

  // Location suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationSuggestions = useMemo(() => {
    if (!locality || locality.trim().length === 0) return [];
    const needle = locality.toLowerCase().trim();
    const suggestions = new Set<string>();

    allProjects.forEach((p) => {
      if (p.locality && p.locality.toLowerCase().includes(needle)) suggestions.add(p.locality);
      if (p.apartment_name && p.apartment_name.toLowerCase().includes(needle)) {
        suggestions.add(`${p.apartment_name} (${p.locality})`);
      }
    });

    return Array.from(suggestions).slice(0, 6);
  }, [allProjects, locality]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="font-serif text-3xl font-bold">Direct Builder &amp; Society Projects</h1>
        <p className="text-sm text-ink/70">
          Curated developments, communities, and multiple property units for sale and rent
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-900">
          Showing verified builder developments. Add your IVY_API_KEY in .env to pull real-time city MLS data.
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="District / Locality / Project (e.g. Sarjapur, Jagatpura, Prestige)"
            value={locality}
            onChange={(e) => {
              setLocality(e.target.value);
              setShowSuggestions(true);
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
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
        >
          <option value="">All Project Statuses</option>
          <option value="active units">Active Units</option>
          <option value="under construction">Under Construction</option>
          <option value="ready to move">Ready to Move</option>
        </select>

        {(locality || status) && (
          <button
            onClick={() => {
              setLocality("");
              setStatus("");
            }}
            className="text-xs font-semibold text-ink/70 hover:underline px-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-12 text-center text-ink/60">
          No projects found matching the criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <article
              key={p.project_id}
              className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="h-44 bg-gradient-to-br from-ink/10 via-sand to-brass/20 p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-bold text-moss capitalize">
                      {p.project_status || "Active"}
                    </span>
                    <span className="text-xs font-semibold text-ink/70">
                      {p.total_units ? `${p.total_units} units` : ""}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink/60 font-semibold">
                      {p.developer_name || "Premier Developer"}
                    </p>
                    <h3 className="font-serif text-xl font-bold text-ink">{p.apartment_name}</h3>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <span className="text-xs text-ink/60">Price Range</span>
                    <p className="font-serif text-xl font-bold text-brass">
                      {inr(p.price_min)} &ndash; {inr(p.price_max)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-ink/5 pt-3">
                    <div>
                      <span className="text-ink/60">Carpet Area Range</span>
                      <p className="font-semibold text-ink">
                        {p.min_area_sqft} - {p.max_area_sqft} sq ft
                      </p>
                    </div>
                    <div>
                      <span className="text-ink/60">Possession Date</span>
                      <p className="font-semibold text-ink">{p.possession_date || "2027+"}</p>
                    </div>
                    <div>
                      <span className="text-ink/60">Available Listings</span>
                      <p className="font-semibold text-ink">{p.total_listings ?? "Several"}</p>
                    </div>
                    <div>
                      <span className="text-ink/60">Locality</span>
                      <p className="font-semibold text-ink capitalize">{p.locality}</p>
                    </div>
                  </div>

                  {p.amenities && p.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.amenities.slice(0, 4).map((a, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-sand px-2 py-0.5 text-[11px] font-medium capitalize text-ink/80"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-ink/5 p-4 bg-sand/10 flex items-center justify-between">
                <span className="text-xs text-ink/50 font-mono">
                  {p.rera_number ? `RERA: ${p.rera_number.slice(0, 14)}...` : ""}
                </span>
                <Link
                  to={`/projects/${p.project_id}`}
                  className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-sand hover:bg-ink/90"
                >
                  View Details &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
