import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

type Stats = {
  totalProperties: number;
  activeProperties: number;
  totalClients: number;
  totalLeads: number;
  totalVisits: number;
  highInterest: number;
  mediumInterest: number;
  lowInterest: number;
};

type Visit = {
  id: string;
  scheduledAt: string;
  status: string;
  notes?: string;
  client: { name: string; phone: string };
  property: { title: string; locality: string };
};

type Interaction = {
  id: string;
  type: string;
  notes: string;
  timestamp: string;
  client: { name: string };
  property?: { title: string } | null;
};

export default function SellerDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<Visit[]>([]);
  const [recent, setRecent] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{
        stats: Stats;
        upcomingVisits: Visit[];
        recentInteractions: Interaction[];
      }>("/seller/dashboard")
      .then((d) => {
        setStats(d.stats);
        setUpcoming(d.upcomingVisits || []);
        setRecent(d.recentInteractions || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-24 text-center text-ink/60">Loading seller dashboard...</div>;
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
        <h3 className="font-serif text-xl font-bold text-red-900">Access Restricted</h3>
        <p className="text-sm text-red-700">{error}</p>
        <p className="text-xs text-ink/60">
          Note: Newly registered sellers must be verified and approved by a Superadmin before accessing this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Seller CRM &amp; Inventory Dashboard</h1>
          <p className="text-sm text-ink/70">Performance metrics, lead interest levels, and upcoming property tours</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/seller/properties"
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-sand hover:bg-ink/90"
          >
            + Manage Properties
          </Link>
          <Link
            to="/seller/clients"
            className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
          >
            Clients &amp; Leads
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-ink/60">Total Properties</span>
          <p className="font-serif text-2xl font-bold text-ink mt-1">{stats?.totalProperties ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-ink/60">Active Listings</span>
          <p className="font-serif text-2xl font-bold text-moss mt-1">{stats?.activeProperties ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-ink/60">Total Clients</span>
          <p className="font-serif text-2xl font-bold text-ink mt-1">{stats?.totalClients ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-ink/60">Total Leads</span>
          <p className="font-serif text-2xl font-bold text-brass mt-1">{stats?.totalLeads ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-red-800">High Interest</span>
          <p className="font-serif text-2xl font-bold text-red-900 mt-1">{stats?.highInterest ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-amber-800">Medium</span>
          <p className="font-serif text-2xl font-bold text-amber-900 mt-1">{stats?.mediumInterest ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase text-gray-700">Low Interest</span>
          <p className="font-serif text-2xl font-bold text-gray-800 mt-1">{stats?.lowInterest ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Upcoming Visits */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold">Upcoming Property Visits</h3>
            <span className="text-xs font-semibold text-moss">{upcoming.length} scheduled</span>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm text-ink/60 py-6 text-center">No upcoming visits scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-ink/5 bg-sand/30 p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-ink">{v.client.name} ({v.client.phone})</p>
                    <p className="text-xs text-ink/70">Property: {v.property.title} · {v.property.locality}</p>
                    {v.notes && <p className="text-xs text-ink/50 italic">"{v.notes}"</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-ink">
                      {new Date(v.scheduledAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-ink/60">
                      {new Date(v.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Client Interactions */}
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold">Recent CRM Activity</h3>
            <Link to="/seller/clients" className="text-xs font-semibold text-moss hover:underline">
              View CRM &rarr;
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-ink/60 py-6 text-center">No recent interactions recorded.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((inter) => (
                <div
                  key={inter.id}
                  className="rounded-2xl border border-ink/5 bg-sand/30 p-4 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink uppercase tracking-wide bg-white px-2 py-0.5 rounded border border-ink/10">
                      {inter.type}
                    </span>
                    <span className="text-ink/50">
                      {new Date(inter.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-ink pt-1">{inter.client.name}</p>
                  <p className="text-ink/80">{inter.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
