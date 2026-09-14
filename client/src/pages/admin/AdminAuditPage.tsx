import { useState, useEffect } from "react";
import { api } from "../../api/client";

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
  createdAt: string;
  actor?: { name: string; email: string } | null;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ results: AuditItem[] }>("/admin/audit-logs")
      .then((d) => setLogs(d.results || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold">System Audit Logs</h1>
        <p className="text-sm text-ink/70">
          Immutable event stream capturing administrative actions, seller approvals, and order closings
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading audit trail...</div>
      ) : logs.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center text-ink/60">
          No audit log events recorded yet.
        </div>
      ) : (
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-semibold text-ink/60 uppercase">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-sand/20">
                  <td className="py-3 px-4 text-ink/60 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold bg-ink/5 px-2 py-0.5 rounded text-ink">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink/80">
                    {log.actor ? `${log.actor.name} (${log.actor.email})` : "System"}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold">{log.entityType}</span>{" "}
                    {log.entityId && <span className="font-mono text-ink/50 text-[10px]">({log.entityId})</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-ink/70 max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
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
