import { useState, useEffect } from "react";
import { api } from "../../api/client";

type UserItem = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  emailVerifiedAt?: string | null;
  createdAt: string;
  sellerProfile?: { status: string; companyName?: string | null } | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ results: UserItem[] }>("/admin/users")
      .then((d) => setUsers(d.results || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold">User Directory</h1>
        <p className="text-sm text-ink/70">
          All registered buyers, agents, and sellers on the Ivy platform
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading users...</div>
      ) : (
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-semibold text-ink/60 uppercase">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status / Company</th>
                <th className="py-3 px-4">Email Verified</th>
                <th className="py-3 px-4">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-sand/20">
                  <td className="py-3 px-4 font-semibold">{u.name}</td>
                  <td className="py-3 px-4 text-xs font-mono text-ink/80">{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        u.role === "SUPERADMIN"
                          ? "bg-ink text-sand"
                          : u.role === "SELLER"
                          ? "bg-brass/20 text-ink"
                          : "bg-moss/10 text-moss"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {u.sellerProfile ? (
                      <span>
                        {u.sellerProfile.companyName || "Seller"} ({u.sellerProfile.status})
                      </span>
                    ) : (
                      <span className="text-ink/40">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold text-moss">
                    {u.emailVerifiedAt ? "Verified ✓" : "Pending OTP"}
                  </td>
                  <td className="py-3 px-4 text-xs text-ink/60">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
