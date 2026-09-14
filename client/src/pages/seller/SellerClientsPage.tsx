import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { inr } from "../../lib/format";
import type { Property } from "../../types";

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  interestLevel: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
  interests?: { id: string; propertyId: string; interestLevel: string; budget?: number; property?: Property }[];
  visits?: { id: string; scheduledAt: string; status: string; property?: Property }[];
  interactions?: { id: string; type: string; notes: string; timestamp: string }[];
};

export default function SellerClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filterInterest, setFilterInterest] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showLogInteraction, setShowLogInteraction] = useState(false);
  const [showScheduleVisit, setShowScheduleVisit] = useState(false);

  // Form states
  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    interestLevel: "MEDIUM" as "HIGH" | "MEDIUM" | "LOW",
  });

  const [interactionForm, setInteractionForm] = useState({
    type: "CALL" as "CALL" | "VISIT" | "NOTE" | "FOLLOW_UP" | "WHATSAPP" | "EMAIL",
    notes: "",
  });

  const [visitForm, setVisitForm] = useState({
    propertyId: "",
    scheduledAt: "",
    notes: "",
  });

  const [myProperties, setMyProperties] = useState<Property[]>([]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const q = filterInterest ? `?interest=${filterInterest}` : "";
      const res = await api.get<{ results: Client[] }>(`/clients${q}`);
      setClients(res.results || []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await api.get<{ results: Property[] }>("/properties/mine");
      setMyProperties(res.results || []);
    } catch {}
  };

  useEffect(() => {
    void fetchClients();
    void fetchProperties();
  }, [filterInterest]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/clients", newClient);
      setShowAddClient(false);
      setNewClient({ name: "", phone: "", email: "", notes: "", interestLevel: "MEDIUM" });
      void fetchClients();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to add client");
    }
  };

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      await api.post("/interactions", {
        clientId: selectedClient.id,
        type: interactionForm.type,
        notes: interactionForm.notes,
      });
      setShowLogInteraction(false);
      setInteractionForm({ type: "CALL", notes: "" });
      // Refresh active client
      const fresh = await api.get<Client>(`/clients/${selectedClient.id}`);
      setSelectedClient(fresh);
      void fetchClients();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to log interaction");
    }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !visitForm.propertyId || !visitForm.scheduledAt) return;
    try {
      await api.post("/visits", {
        clientId: selectedClient.id,
        propertyId: visitForm.propertyId,
        scheduledAt: new Date(visitForm.scheduledAt).toISOString(),
        notes: visitForm.notes,
      });
      setShowScheduleVisit(false);
      setVisitForm({ propertyId: "", scheduledAt: "", notes: "" });
      const fresh = await api.get<Client>(`/clients/${selectedClient.id}`);
      setSelectedClient(fresh);
      void fetchClients();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to schedule visit");
    }
  };

  const selectClientDetails = async (c: Client) => {
    try {
      const full = await api.get<Client>(`/clients/${c.id}`);
      setSelectedClient(full);
    } catch {
      setSelectedClient(c);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Client Relationship Management (CRM)</h1>
          <p className="text-sm text-ink/70">
            Track customer interest levels, call logs, WhatsApp follow-ups, and scheduled property tours
          </p>
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-sand shadow hover:bg-ink/90"
        >
          + Add Client / Lead
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs font-semibold">
        {["", "HIGH", "MEDIUM", "LOW"].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilterInterest(lvl)}
            className={`rounded-xl px-4 py-2 transition ${
              filterInterest === lvl
                ? "bg-ink text-sand shadow"
                : "bg-white border border-ink/10 text-ink/70 hover:bg-sand"
            }`}
          >
            {lvl ? `${lvl} Interest` : "All Clients"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading CRM data...</div>
      ) : clients.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center space-y-3">
          <p className="font-serif text-xl font-bold">No clients recorded</p>
          <p className="text-sm text-ink/70">
            Click "+ Add Client" to record interested buyers or register manual leads.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clients List */}
          <div className="lg:col-span-2 space-y-3">
            {clients.map((c) => (
              <div
                key={c.id}
                onClick={() => void selectClientDetails(c)}
                className={`cursor-pointer rounded-2xl border p-4 transition bg-white shadow-sm hover:border-brass ${
                  selectedClient?.id === c.id ? "border-brass ring-1 ring-brass" : "border-ink/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        c.interestLevel === "HIGH"
                          ? "bg-red-500"
                          : c.interestLevel === "MEDIUM"
                          ? "bg-amber-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <h3 className="font-serif text-base font-bold text-ink">{c.name}</h3>
                      <p className="text-xs text-ink/60">{c.phone} {c.email ? `· ${c.email}` : ""}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      c.interestLevel === "HIGH"
                        ? "bg-red-50 text-red-800"
                        : c.interestLevel === "MEDIUM"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {c.interestLevel} Interest
                  </span>
                </div>

                {c.notes && (
                  <p className="mt-2 text-xs text-ink/70 line-clamp-1 italic bg-sand/30 p-2 rounded-lg">
                    "{c.notes}"
                  </p>
                )}

                <div className="mt-3 flex gap-4 text-[11px] text-ink/60 border-t border-ink/5 pt-2">
                  <span>{c.interactions?.length ?? 0} interactions</span>
                  <span>{c.visits?.length ?? 0} visits</span>
                </div>
              </div>
            ))}
          </div>

          {/* Client Details Sidebar */}
          <div>
            {selectedClient ? (
              <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-6 sticky top-24">
                <div className="border-b border-ink/10 pb-4">
                  <div className="flex justify-between items-center">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        selectedClient.interestLevel === "HIGH"
                          ? "bg-red-100 text-red-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {selectedClient.interestLevel}
                    </span>
                    <span className="text-xs text-ink/50">
                      Added {new Date(selectedClient.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold mt-2 text-ink">{selectedClient.name}</h2>
                  <p className="text-xs text-ink/70">📞 {selectedClient.phone}</p>
                  {selectedClient.email && <p className="text-xs text-ink/70">✉️ {selectedClient.email}</p>}
                </div>

                {selectedClient.notes && (
                  <div>
                    <span className="text-xs uppercase tracking-wider text-ink/50 font-semibold">Key Notes</span>
                    <p className="text-xs text-ink/80 mt-1 italic bg-sand/30 p-3 rounded-xl">
                      {selectedClient.notes}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowLogInteraction(true)}
                    className="rounded-xl bg-ink py-2 text-xs font-semibold text-sand hover:bg-ink/90"
                  >
                    + Log Interaction
                  </button>
                  <button
                    onClick={() => setShowScheduleVisit(true)}
                    className="rounded-xl border border-ink/20 py-2 text-xs font-semibold text-ink hover:bg-sand"
                  >
                    + Schedule Visit
                  </button>
                </div>

                {/* History */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-serif text-base font-bold">Activity Timeline</h4>
                  <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
                    {(selectedClient.interactions || []).length === 0 ? (
                      <p className="text-ink/50 text-center py-3">No activity logged yet.</p>
                    ) : (
                      selectedClient.interactions?.map((act) => (
                        <div key={act.id} className="rounded-xl bg-sand/30 p-2.5 space-y-1">
                          <div className="flex justify-between font-bold text-[10px]">
                            <span className="uppercase text-moss">{act.type}</span>
                            <span className="text-ink/40">{new Date(act.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-ink/80">{act.notes}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-ink/20 p-8 text-center text-xs text-ink/50">
                Select a client to view their full profile, interaction log, and property visits.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">Register Client / Lead</h3>
              <button onClick={() => setShowAddClient(false)} className="text-xl text-ink/50 hover:text-ink">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink/70 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/70 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98000 12345"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/70 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/70 mb-1">Interest Level</label>
                <select
                  value={newClient.interestLevel}
                  onChange={(e) => setNewClient({ ...newClient, interestLevel: e.target.value as any })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                >
                  <option value="HIGH">High (Hot Lead / Ready to Buy)</option>
                  <option value="MEDIUM">Medium (Exploring Options)</option>
                  <option value="LOW">Low (Casual Inquirer)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink/70 mb-1">Notes / Requirements</label>
                <textarea
                  rows={3}
                  placeholder="Budget, preferred BHK, localities, timeline..."
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-ink px-5 py-2 font-semibold text-sand hover:bg-ink/90"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Interaction Modal */}
      {showLogInteraction && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">Log Interaction</h3>
              <button onClick={() => setShowLogInteraction(false)} className="text-xl text-ink/50 hover:text-ink">
                &times;
              </button>
            </div>
            <p className="text-xs text-ink/70">Recording interaction with {selectedClient.name}</p>

            <form onSubmit={handleLogInteraction} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink/70 mb-1">Type</label>
                <select
                  value={interactionForm.type}
                  onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value as any })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="VISIT">Site Visit</option>
                  <option value="EMAIL">Email</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="NOTE">General Note</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink/70 mb-1">Interaction Notes</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Summary of discussion, client objections, next steps..."
                  value={interactionForm.notes}
                  onChange={(e) => setInteractionForm({ ...interactionForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogInteraction(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-ink px-5 py-2 font-semibold text-sand hover:bg-ink/90"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {showScheduleVisit && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">Schedule Property Visit</h3>
              <button onClick={() => setShowScheduleVisit(false)} className="text-xl text-ink/50 hover:text-ink">
                &times;
              </button>
            </div>

            <form onSubmit={handleScheduleVisit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink/70 mb-1">Target Property</label>
                <select
                  required
                  value={visitForm.propertyId}
                  onChange={(e) => setVisitForm({ ...visitForm, propertyId: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm"
                >
                  <option value="">Select Property...</option>
                  {myProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.locality})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink/70 mb-1">Scheduled Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={visitForm.scheduledAt}
                  onChange={(e) => setVisitForm({ ...visitForm, scheduledAt: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/70 mb-1">Visit Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Key focus areas, special directions..."
                  value={visitForm.notes}
                  onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleVisit(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-ink px-5 py-2 font-semibold text-sand hover:bg-ink/90"
                >
                  Schedule Tour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
