import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr, imgSrc } from "../../lib/format";
import type { Property } from "../../types";

type CartItem = {
  id: string;
  propertyId: string;
  property: Property;
};

type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const data = await api.get<Cart>("/cart");
      setCart(data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCart();
  }, []);

  const handleRemove = async (propertyId: string) => {
    try {
      const updated = await api.del<Cart>(`/cart/${propertyId}`);
      setCart(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to remove item");
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;
    setCheckingOut(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>("/cart/checkout");
      setMsg(res.message || "Purchase closing initiated! A legal closing executive and the property seller have been notified.");
      await fetchCart();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to initiate purchase closing");
    } finally {
      setCheckingOut(false);
    }
  };

  const total = cart?.items.reduce((sum, i) => sum + (i.property?.price || 0), 0) || 0;

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold">Purchase Closing Cart</h1>
        <p className="text-sm text-ink/70">
          Reserved inventory ready for title verification, escrow, and registry
        </p>
      </div>

      {msg && (
        <div className="rounded-2xl bg-moss/10 border border-moss/20 p-4 text-sm font-semibold text-moss flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>{msg}</span>
          <Link to="/customer/orders" className="underline text-ink hover:text-moss text-xs font-bold">
            View My Orders &rarr;
          </Link>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading cart...</div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center space-y-4">
          <p className="font-serif text-xl font-bold">Your cart is empty</p>
          <p className="text-sm text-ink/70">
            Add properties from the catalogue to reserve them for closing.
          </p>
          <Link
            to="/properties"
            className="inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-sand hover:bg-ink/90"
          >
            Explore Properties &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Cart items list */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const p = item.property;
              const img = p.images?.[0]?.path;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"
                >
                  <Link to={`/properties/${p.id}`} className="shrink-0 w-full sm:w-36">
                    <img
                      src={imgSrc(img)}
                      alt={p.title}
                      className="h-28 w-full rounded-xl object-cover hover:opacity-90 transition"
                    />
                  </Link>
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <p className="text-xs uppercase tracking-wide text-moss font-semibold">
                      {p.bhk} BHK · {p.locality}
                    </p>
                    <Link to={`/properties/${p.id}`} className="hover:underline">
                      <h3 className="font-serif text-lg font-bold">{p.title}</h3>
                    </Link>
                    <p className="font-serif text-xl font-bold text-brass">{inr(p.price)}</p>
                    <p className="text-xs text-ink/60">{p.carpetArea} sq ft · {p.city}</p>
                  </div>
                  <div className="flex sm:flex-col gap-2">
                    <Link
                      to={`/properties/${p.id}`}
                      className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sand text-center"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => void handleRemove(p.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-xl font-bold">Order Summary</h3>
              <div className="space-y-2 border-b border-ink/5 pb-3 text-sm">
                <div className="flex justify-between text-ink/70">
                  <span>Selected Properties ({cart.items.length})</span>
                  <span>{inr(total)}</span>
                </div>
                <div className="flex justify-between text-ink/70">
                  <span>Escrow &amp; Document Fee</span>
                  <span className="text-moss font-medium">Included</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="font-semibold text-sm">Total Valuation</span>
                <span className="font-serif text-2xl font-bold text-ink">{inr(total)}</span>
              </div>

              <button
                onClick={() => void handleCheckout()}
                disabled={checkingOut}
                className="w-full rounded-xl bg-ink py-3 font-semibold text-sand hover:bg-ink/90 transition shadow disabled:opacity-50"
              >
                {checkingOut ? "Processing Purchase Closing..." : "Proceed to Purchase Closing"}
              </button>
              <p className="text-[11px] text-ink/50 text-center">
                Strict Superadmin oversight: Official status is marked SOLD upon final verification.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
