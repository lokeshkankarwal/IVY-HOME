import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<"CUSTOMER" | "SELLER">("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Verification state
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post<{ message: string; devOtpHint?: boolean }>("/auth/register", {
        name,
        email,
        password,
        phone,
        role,
        companyName: role === "SELLER" ? companyName : undefined,
      });

      setShowOtp(true);
      setDevOtpHint(Boolean(res.devOtpHint));
      setOtpMsg(res.message || "OTP code sent to your email.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);

    try {
      const res = await api.post<{ message: string; sellerPending?: boolean }>("/auth/verify", {
        email,
        otp,
      });

      if (res.sellerPending) {
        alert("Email verified successfully! Your seller account has been submitted for Superadmin approval.");
      } else {
        alert("Account verified successfully! You can now log in.");
      }
      navigate("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await api.post("/auth/resend-otp", { email });
      setOtpMsg("A fresh OTP has been dispatched.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    }
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl font-bold">Create an Account</h1>
          <p className="text-xs text-ink/70">
            Join Ivy Homes as a property buyer or verified seller
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        {!showOtp ? (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1">Account Role</label>
              <div className="flex rounded-xl bg-ink/5 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRole("CUSTOMER")}
                  className={`flex-1 rounded-lg py-2 transition ${
                    role === "CUSTOMER" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  Customer / Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setRole("SELLER")}
                  className={`flex-1 rounded-lg py-2 transition ${
                    role === "SELLER" ? "bg-white shadow text-ink" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  Seller / Agency
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-ink/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
              />
            </div>

            {role === "SELLER" && (
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Company / Agency Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Realty Bangalore"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>
            )}

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
              <label className="block text-xs font-semibold text-ink/70 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98000 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-ink/20 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
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
              {loading ? "Registering..." : `Register as ${role === "SELLER" ? "Seller" : "Customer"}`}
            </button>
          </form>
        ) : (
          /* OTP Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-xl bg-sand/50 p-4 border border-ink/10 text-xs text-ink/80 space-y-1">
              <p className="font-semibold text-ink">{otpMsg}</p>
              <p>Sent to <span className="font-bold">{email}</span>.</p>
              {devOtpHint && (
                <p className="text-moss font-semibold pt-1">
                  (Development mode: check the server terminal console for your generated 6-digit OTP code)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1">6-Digit Verification Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-xl border border-ink/20 px-3 py-2.5 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-brass"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full rounded-xl bg-ink py-3 font-semibold text-sand shadow hover:bg-ink/90 transition disabled:opacity-50"
            >
              {verifying ? "Verifying..." : "Verify & Complete Registration"}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-moss font-semibold hover:underline"
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={() => setShowOtp(false)}
                className="text-ink/60 hover:text-ink"
              >
                Edit Information
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-ink/60 pt-2 border-t border-ink/5">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-moss underline">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
}
