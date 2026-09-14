import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

type AdminStats = {
  sellers: number;
  customers: number;
  properties: number;
  sold: number;
  pendingSellerApprovals: number;
  orders: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminStats>("/admin/dashboard")
      .then((d) => setStats(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-24 text-center text-ink/60">Loading admin console...</div>;
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-3">
        <h3 className="font-serif text-xl font-bold text-red-900">Access Denied</h3>
        <p className="text-sm text-red-700">{error}</p>
        <p className="text-xs text-ink/60">Superadmin privileges are required to view this area.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-moss font-bold">Platform Governance</span>
          <h1 className="font-serif text-3xl font-bold mt-1">Superadmin Console</h1>
          <p className="text-sm text-ink/70">
            Enforce seller approvals, oversee listings inventory, verify order deeds, and inspect audit trails
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/sellers"
            className="rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-sand shadow hover:bg-ink/90"
          >
            Review Sellers ({stats?.pendingSellerApprovals ?? 0} Pending)
          </Link>
          <Link
            to="/admin/properties"
            className="rounded-xl border border-ink/20 px-4 py-2 text-xs font-semibold text-ink hover:bg-sand"
          >
            Manage Properties
          </Link>
          <Link
            to="/admin/audit"
            className="rounded-xl border border-ink/20 px-4 py-2 text-xs font-semibold text-ink hover:bg-sand"
          >
            Audit Log
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-amber-900 font-bold">Pending Approvals</span>
          <p className="font-serif text-3xl font-bold text-amber-900 mt-2">
            {stats?.pendingSellerApprovals ?? 0}
          </p>
          <p className="text-[11px] text-amber-800 mt-1">Sellers awaiting review</p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold">Approved Sellers</span>
          <p className="font-serif text-3xl font-bold text-ink mt-2">{stats?.sellers ?? 0}</p>
          <p className="text-[11px] text-ink/50 mt-1">Active verified agencies</p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold">Registered Users</span>
          <p className="font-serif text-3xl font-bold text-ink mt-2">{stats?.customers ?? 0}</p>
          <p className="text-[11px] text-ink/50 mt-1">Buyers &amp; clients</p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold">Platform Properties</span>
          <p className="font-serif text-3xl font-bold text-ink mt-2">{stats?.properties ?? 0}</p>
          <p className="text-[11px] text-ink/50 mt-1">Catalogued listings</p>
        </div>

        <div className="rounded-2xl border border-moss/20 bg-moss/5 p-5 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-moss font-bold">Marked SOLD</span>
          <p className="font-serif text-3xl font-bold text-moss mt-2">{stats?.sold ?? 0}</p>
          <p className="text-[11px] text-moss/80 mt-1">Superadmin confirmed</p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-ink/60 font-semibold">Orders Issued</span>
          <p className="font-serif text-3xl font-bold text-ink mt-2">{stats?.orders ?? 0}</p>
          <p className="text-[11px] text-ink/50 mt-1">Transactional deeds</p>
        </div>
      </div>

      {/* Admin Quick Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-3">
          <h3 className="font-serif text-lg font-bold">Seller Onboarding &amp; Vetting</h3>
          <p className="text-xs text-ink/70 leading-relaxed">
            Review identity documents, verify company registrations, and authorize or suspend seller accounts.
          </p>
          <Link
            to="/admin/sellers"
            className="inline-block rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-sand hover:bg-ink/90"
          >
            Review Seller Applications &rarr;
          </Link>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-3">
          <h3 className="font-serif text-lg font-bold">Exclusive SOLD Authority</h3>
          <p className="text-xs text-ink/70 leading-relaxed">
            Only Superadmins can transition a property to SOLD, safeguarding inventory integrity across all roles.
          </p>
          <Link
            to="/admin/properties"
            className="inline-block rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-sand hover:bg-ink/90"
          >
            Manage Inventory &rarr;
          </Link>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-3">
          <h3 className="font-serif text-lg font-bold">Immutable Audit Trail</h3>
          <p className="text-xs text-ink/70 leading-relaxed">
            Inspect all high-privilege actions: seller status changes, property status transitions, and order closings.
          </p>
          <Link
            to="/admin/audit"
            className="inline-block rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-sand hover:bg-ink/90"
          >
            Inspect Audit Trail &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
