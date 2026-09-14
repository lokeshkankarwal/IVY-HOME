import { useState } from "react";
import { useAuth } from "../../auth";
import { api } from "../../api/client";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await api.patch("/auth/profile", { name, phone });
      await refresh();
      setMsg("Profile updated successfully!");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="py-20 text-center text-ink/60">Please log in to view your profile.</div>;
  }

  return (
    <div className="mx-auto max-w-xl py-8 space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Account Profile</h1>
        <p className="text-sm text-ink/70">Manage your contact details and active system role</p>
      </div>

      {msg && (
        <div className="rounded-xl bg-moss/10 border border-moss/20 p-3 text-sm text-moss font-semibold">
          {msg}
        </div>
      )}

      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-ink/5 pb-4">
          <div>
            <span className="text-xs text-ink/50 uppercase tracking-wider font-semibold">System Role</span>
            <p className="font-serif text-xl font-bold text-ink">{user.role}</p>
          </div>
          {user.role === "SELLER" && (
            <div className="text-right">
              <span className="text-xs text-ink/50 uppercase tracking-wider font-semibold">Seller Status</span>
              <p className="text-xs font-bold text-moss capitalize">{user.sellerStatus || "Pending"}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full rounded-xl border border-ink/10 bg-sand/30 px-3 py-2 text-sm text-ink/70 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98000 00000"
              className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-ink px-6 py-2.5 text-sm font-semibold text-sand hover:bg-ink/90 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
