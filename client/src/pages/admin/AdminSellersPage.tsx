import { useState, useEffect } from "react";
import { api } from "../../api/client";

type SellerRequest = {
  id: string;
  userId: string;
  companyName?: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    emailVerifiedAt?: string | null;
  };
};

export default function AdminSellersPage() {
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [allSellers, setAllSellers] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqs, all] = await Promise.all([
        api.get<{ results: SellerRequest[] }>("/admin/seller-requests"),
        api.get<{ results: SellerRequest[] }>("/admin/sellers"),
      ]);
      setRequests(reqs.results || []);
      setAllSellers(all.results || []);
    } catch {
      setRequests([]);
      setAllSellers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleReview = async (id: string, action: "APPROVE" | "REJECT" | "SUSPEND", reason?: string) => {
    try {
      await api.post(`/admin/sellers/${id}/review`, { action, reason });
      setRejectId(null);
      setRejectReason("");
      void fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Review action failed");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold">Seller Verification &amp; Governance</h1>
        <p className="text-sm text-ink/70">
          Superadmin approval controls for real estate sellers and brokerage agencies
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-ink/5 p-1 text-xs font-semibold max-w-xs">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex-1 rounded-lg py-2 transition ${
            activeTab === "pending" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
          }`}
        >
          Pending Approvals ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 rounded-lg py-2 transition ${
            activeTab === "all" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
          }`}
        >
          All Sellers ({allSellers.length})
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading seller requests...</div>
      ) : activeTab === "pending" ? (
        requests.length === 0 ? (
          <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center text-ink/60">
            No pending seller approval requests. All active applications have been processed.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 uppercase">
                      {r.status}
                    </span>
                    <span className="text-xs text-ink/50">
                      Applied {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold">{r.companyName || r.user.name}</h3>
                  <p className="text-xs text-ink/70">
                    Contact: {r.user.name} ({r.user.email}) · Phone: {r.user.phone || "—"}
                  </p>
                  <p className="text-[11px] text-moss font-semibold">
                    Email Verified: {r.user.emailVerifiedAt ? "Yes ✓" : "Pending OTP"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => void handleReview(r.id, "APPROVE")}
                    className="rounded-xl bg-moss px-4 py-2 text-xs font-semibold text-white shadow hover:bg-moss/90"
                  >
                    Approve Seller
                  </button>
                  <button
                    onClick={() => setRejectId(r.id)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Reject...
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* All Sellers Table */
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-semibold text-ink/60 uppercase">
                <th className="py-3 px-4">Company / Agent</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {allSellers.map((s) => (
                <tr key={s.id} className="hover:bg-sand/20">
                  <td className="py-3 px-4 font-semibold">{s.companyName || s.user.name}</td>
                  <td className="py-3 px-4 text-xs text-ink/70">
                    {s.user.email} <br /> {s.user.phone}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        s.status === "APPROVED"
                          ? "bg-moss/10 text-moss"
                          : s.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-ink/60">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {s.status === "APPROVED" ? (
                      <button
                        onClick={() => void handleReview(s.id, "SUSPEND")}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Suspend
                      </button>
                    ) : s.status !== "APPROVED" ? (
                      <button
                        onClick={() => void handleReview(s.id, "APPROVE")}
                        className="rounded-lg bg-moss px-3 py-1 text-xs font-semibold text-white hover:bg-moss/90"
                      >
                        Approve
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold">Reject Seller Application</h3>
            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1">Reason for Rejection</label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Incomplete documentation, unverifiable license, etc."
                className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-ink/70 hover:bg-ink/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReview(rejectId, "REJECT", rejectReason)}
                className="rounded-xl bg-red-700 px-5 py-2 text-xs font-semibold text-white hover:bg-red-800"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
