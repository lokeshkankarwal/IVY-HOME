import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [tab, setTab] = useState<"ivy" | "platform">("ivy");
  const [email, setEmail] = useState("demo1@ivy.homes");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tab === "ivy") {
        await api.post("/auth/ivy-login", { email, password });
      } else {
        await api.post("/auth/login", { email, password });
      }
      await refresh();
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const setIvyDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    // password provided in email with key, or if set in env
  };

  const setPlatformUser = (roleEmail: string, pass: string) => {
    setEmail(roleEmail);
    setPassword(pass);
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl font-bold">Welcome to Ivy Homes</h1>
          <p className="text-xs text-ink/70">
            Select your login method below
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-2xl bg-ink/5 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab("ivy");
              setEmail("demo1@ivy.homes");
              setPassword("");
              setError(null);
            }}
            className={`flex-1 rounded-xl py-2 transition ${
              tab === "ivy" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
            }`}
          >
            Ivy Demo User
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("platform");
              setEmail("customer@ivy.local");
              setPassword("Customer123!");
              setError(null);
            }}
            className={`flex-1 rounded-xl py-2 transition ${
              tab === "platform" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
            }`}
          >
            Platform Account
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        {/* 1-Click Preset Shortcuts */}
        {tab === "ivy" ? (
          <div className="space-y-2 rounded-2xl bg-sand/40 p-3 border border-ink/5">
            <span className="text-[11px] font-semibold uppercase text-ink/60">Demo Accounts:</span>
            <div className="flex flex-wrap gap-2">
              {["demo1@ivy.homes", "demo2@ivy.homes", "demo3@ivy.homes"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setIvyDemo(d)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition ${
                    email === d ? "bg-ink text-sand" : "bg-white border border-ink/10 text-ink/80 hover:bg-sand"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink/50 pt-1">
              Uses the key password issued with your API key from registration.
            </p>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl bg-sand/40 p-3 border border-ink/5">
            <span className="text-[11px] font-semibold uppercase text-ink/60">Quick Role Shortcuts:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlatformUser("customer@ivy.local", "Customer123!")}
                className="rounded-lg bg-white border border-ink/10 px-2.5 py-1 text-xs font-medium text-ink/80 hover:bg-sand"
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setPlatformUser("seller@ivy.local", "Seller123!")}
                className="rounded-lg bg-white border border-ink/10 px-2.5 py-1 text-xs font-medium text-ink/80 hover:bg-sand"
              >
                Seller (Approved)
              </button>
              <button
                type="button"
                onClick={() => setPlatformUser("admin@ivy.local", "Admin123!")}
                className="rounded-lg bg-ink text-sand px-2.5 py-1 text-xs font-medium"
              >
                Superadmin
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-ink/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ink py-3 font-semibold text-sand shadow hover:bg-ink/90 transition disabled:opacity-50"
          >
            {loading ? "Authenticating..." : tab === "ivy" ? "Login with Ivy Credentials" : "Login"}
          </button>
        </form>

        <div className="text-center text-xs text-ink/60 pt-2 border-t border-ink/5">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-moss underline">
            Register as Customer or Seller
          </Link>
        </div>
      </div>
    </div>
  );
}
