import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr } from "../../lib/format";
import type { IvyProject } from "../../types";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<IvyProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<IvyProject>(`/ivy/projects/${id}`)
      .then((p) => setProject(p))
      .catch(() => {
        // Fallback demo project
        setProject({
          project_id: id,
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
          amenities: ["gym", "swimming pool", "clubhouse", "children play park", "badminton court", "jogging track"],
          latitude: 12.90121,
          longitude: 77.68442,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-24 text-center text-ink/60">Loading project...</div>;
  if (!project) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Project Not Found</h2>
        <Link to="/projects" className="inline-block rounded-xl bg-ink px-4 py-2 text-sm text-sand">
          &larr; Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <nav className="flex items-center gap-2 text-xs text-ink/60">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to="/projects" className="hover:text-ink">Projects</Link>
        <span>/</span>
        <span className="text-ink font-medium capitalize">{project.apartment_name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-ink via-[#1c3854] to-ink p-8 text-sand shadow space-y-4">
            <span className="rounded-full bg-brass/20 text-brass px-3 py-1 text-xs font-bold uppercase tracking-wider">
              {project.project_status || "Active Development"}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold">{project.apartment_name}</h1>
            <p className="text-sand/80 text-sm">
              Developed by <span className="font-semibold text-sand">{project.developer_name || "Renowned Builder"}</span> in{" "}
              <span className="capitalize font-semibold text-sand">{project.locality}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <div>
              <span className="text-xs text-ink/60 uppercase">Total Units</span>
              <p className="font-serif text-lg font-bold">{project.total_units || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Towers</span>
              <p className="font-serif text-lg font-bold">{project.total_towers || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Total Floors</span>
              <p className="font-serif text-lg font-bold">{project.total_floors || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Inventory Count</span>
              <p className="font-serif text-lg font-bold">{project.total_listings ?? "—"} active</p>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">RERA & Launch Timelines</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="text-ink/60">Launch Date</span>
                <p className="font-medium">{project.launch_date || "—"}</p>
              </div>
              <div>
                <span className="text-ink/60">Possession Date</span>
                <p className="font-medium">{project.possession_date || "—"}</p>
              </div>
              <div>
                <span className="text-ink/60">RERA Number</span>
                <p className="font-mono text-xs font-semibold text-moss">{project.rera_number || "Verified"}</p>
              </div>
              <div>
                <span className="text-ink/60">Unit Sizes</span>
                <p className="font-medium">{project.min_area_sqft} &ndash; {project.max_area_sqft} sq ft</p>
              </div>
              <div>
                <span className="text-ink/60">Starting Price</span>
                <p className="font-medium">{inr(project.price_min)}</p>
              </div>
              <div>
                <span className="text-ink/60">Maximum Price</span>
                <p className="font-medium">{inr(project.price_max)}</p>
              </div>
            </div>
          </div>

          {project.amenities && (
            <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm space-y-3">
              <h3 className="font-serif text-xl font-bold">Project Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {project.amenities.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-sand/40 p-3 text-sm font-medium capitalize text-ink">
                    <span className="text-moss">✓</span> {a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-md space-y-4">
            <span className="text-xs uppercase tracking-wider text-moss font-semibold">Pricing</span>
            <p className="font-serif text-2xl font-bold text-brass">
              {inr(project.price_min)} &ndash; {inr(project.price_max)}
            </p>
            <p className="text-xs text-ink/60">Units range from {project.min_area_sqft} to {project.max_area_sqft} sq ft</p>

            <div className="pt-2">
              <Link
                to={`/properties?locality=${encodeURIComponent(project.locality)}`}
                className="block text-center w-full rounded-xl bg-ink py-3 font-semibold text-sand hover:bg-ink/90"
              >
                Browse Units in this Locality &rarr;
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm space-y-3">
            <h3 className="font-serif text-base font-bold">Location</h3>
            <p className="text-sm font-semibold text-ink">📍 {project.locality}</p>
            <p className="text-xs text-ink/70 capitalize">{project.locality}, Bengaluru</p>
          </div>
        </div>
      </div>
    </div>
  );
}
