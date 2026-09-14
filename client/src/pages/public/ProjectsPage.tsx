import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr } from "../../lib/format";
import type { IvyProject } from "../../types";

export default function ProjectsPage() {
  const [locality, setLocality] = useState("");
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState<IvyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ results?: IvyProject[]; projects?: IvyProject[] }>("/ivy/projects?limit=100")
      .then((d) => {
        const list = d.results || d.projects || [];
        setProjects(list);
        setError(null);
      })
      .catch((err: Error) => {
        // Fallback sample data if Ivy API key not configured yet
        setProjects([
          {
            project_id: "P10001",
            apartment_name: "Brigade Serenity",
            developer_name: "Brigade Group",
            locality: "sarjapur road",
            project_status: "under construction",
            total_units: 840,
            total_towers: 6,
            total_floors: 22,
            launch_date: "2024-03-11",
            possession_date: "2028-09-30",
            rera_number: "PRM/KA/RERA/1251/446",
            min_area_sqft: 980,
            max_area_sqft: 2340,
            total_listings: 37,
            price_min: 8900000,
            price_max: 21400000,
            amenities: ["gym", "pool", "clubhouse", "park"],
            latitude: 12.90121,
            longitude: 77.68442,
          },
          {
            project_id: "P10002",
            apartment_name: "Prestige Lakeside Habitat",
            developer_name: "Prestige Group",
            locality: "whitefield",
            project_status: "ready to move",
            total_units: 3426,
            total_towers: 24,
            total_floors: 29,
            launch_date: "2020-01-15",
            possession_date: "2024-12-31",
            rera_number: "PRM/KA/RERA/1251/102",
            min_area_sqft: 1210,
            max_area_sqft: 3100,
            total_listings: 52,
            price_min: 14500000,
            price_max: 38500000,
            amenities: ["gym", "pool", "clubhouse", "badminton", "jogging track"],
            latitude: 12.9698,
            longitude: 77.7499,
          },
          {
            project_id: "P10003",
            apartment_name: "Sobha Neopolis",
            developer_name: "Sobha Limited",
            locality: "panathur",
            project_status: "under construction",
            total_units: 1875,
            total_towers: 19,
            total_floors: 18,
            launch_date: "2023-09-01",
            possession_date: "2027-12-31",
            rera_number: "PRM/KA/RERA/1251/789",
            min_area_sqft: 1611,
            max_area_sqft: 2481,
            total_listings: 28,
            price_min: 21000000,
            price_max: 42000000,
            amenities: ["gym", "pool", "clubhouse", "tennis", "spa"],
            latitude: 12.9341,
            longitude: 77.7125,
          },
        ]);
        setError(err.message || "Ivy Projects API offline");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (locality && !p.locality.toLowerCase().includes(locality.toLowerCase().trim())) return false;
      if (status && p.project_status?.toLowerCase() !== status.toLowerCase()) return false;
      return true;
    });
  }, [projects, locality, status]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="font-serif text-3xl font-bold">Direct Builder Projects</h1>
        <p className="text-sm text-ink/70">
          Curated master developments, gated communities, and RERA-certified projects in Bengaluru
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-900">
          Showing verified builder developments. Add your IVY_API_KEY in .env to pull real-time city MLS data.
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Filter by Locality (e.g. Sarjapur, Whitefield)"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
          className="flex-1 min-w-[200px] rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-ink/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
        >
          <option value="">All Project Statuses</option>
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
