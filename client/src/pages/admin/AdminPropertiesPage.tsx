import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { inr, imgSrc } from "../../lib/format";
import type { Property } from "../../types";

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [soldModalProp, setSoldModalProp] = useState<Property | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ results: Property[] }>("/admin/properties");
      setProperties(res.results || []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProperties();
  }, []);

  const handleMarkSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soldModalProp) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/properties/${soldModalProp.id}/sold`, {
        customerId: customerId || undefined,
      });
      setSoldModalProp(null);
      setCustomerId("");
      void fetchProperties();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to mark as SOLD");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold">Manage Platform Inventory</h1>
        <p className="text-sm text-ink/70">
          Superadmin exclusive controls: verify active properties and execute official SOLD state transitions
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading properties...</div>
      ) : (
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-semibold text-ink/60 uppercase">
                <th className="py-3 px-4">Property</th>
                <th className="py-3 px-4">Seller</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Locality</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">SOLD Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-sand/20">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={imgSrc(p.images?.[0]?.path)}
                        alt=""
                        className="h-10 w-14 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-semibold text-ink line-clamp-1">{p.title}</p>
                        <p className="text-xs text-ink/50">{p.bhk} BHK · {p.carpetArea} sq ft</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-ink/70">
                    {p.seller?.name || "Direct Seller"} <br />
                    <span className="text-[10px] text-ink/40">{p.seller?.email}</span>
                  </td>
                  <td className="py-3 px-4 font-serif font-bold text-brass">{inr(p.price)}</td>
                  <td className="py-3 px-4 text-xs capitalize">{p.locality}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        p.status === "SOLD"
                          ? "bg-ink text-sand"
                          : p.status === "ACTIVE"
                          ? "bg-moss/10 text-moss"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {p.status !== "SOLD" ? (
                      <button
                        onClick={() => setSoldModalProp(p)}
                        className="rounded-xl bg-ink px-3 py-1.5 text-xs font-semibold text-sand hover:bg-ink/90 shadow"
                      >
                        Mark as SOLD
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-ink/50">Completed ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mark SOLD Modal */}
      {soldModalProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">Mark Property as SOLD</h3>
              <button onClick={() => setSoldModalProp(null)} className="text-xl text-ink/50 hover:text-ink">
                &times;
              </button>
            </div>
            <p className="text-xs text-ink/70">
              Confirm legal deed closing for <span className="font-bold">{soldModalProp.title}</span> at{" "}
              <span className="font-bold text-brass">{inr(soldModalProp.price)}</span>.
            </p>

            <form onSubmit={handleMarkSold} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink/70 mb-1">
                  Buyer / Customer User ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. cuid of purchaser"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
                <p className="text-[11px] text-ink/50 mt-1">
                  If entered, an official Order deed is assigned to the buyer's account.
                </p>
              </div>

              <div className="rounded-xl bg-sand/50 p-3 text-[11px] text-ink/70 border border-ink/10">
                ⚠️ This action updates the property status to SOLD, cleans up pending carts, and logs an immutable audit event.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSoldModalProp(null)}
                  className="rounded-xl px-4 py-2 font-semibold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-ink px-5 py-2 font-semibold text-sand hover:bg-ink/90 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Confirm SOLD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
