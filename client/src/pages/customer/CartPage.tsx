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

  const total = (cart?.items || []).reduce((sum, item) => sum + (item.property?.price || 0), 0);

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold">Property Cart</h1>
        <p className="text-sm text-ink/70">
          Items selected for transactional processing and documentation
        </p>
      </div>

      {msg && (
        <div className="rounded-2xl bg-moss/10 border border-moss/20 p-4 text-sm font-semibold text-moss">
          {msg}
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
                  <img
                    src={imgSrc(img)}
                    alt=""
                    className="h-28 w-full sm:w-36 rounded-xl object-cover"
                  />
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <p className="text-xs uppercase tracking-wide text-moss font-semibold">
                      {p.bhk} BHK · {p.locality}
                    </p>
                    <h3 className="font-serif text-lg font-bold">{p.title}</h3>
                    <p className="font-serif text-xl font-bold text-brass">{inr(p.price)}</p>
                    <p className="text-xs text-ink/60">{p.carpetArea} sq ft · {p.city}</p>
                  </div>
                  <div className="flex sm:flex-col gap-2">
                    <Link
                      to={`/properties/${p.id}`}
                      className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sand"
                    >
                      View
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
                onClick={() => {
                  setMsg("Order intent recorded! A legal closing executive has been assigned to prepare the sale deed.");
                }}
                className="w-full rounded-xl bg-ink py-3 font-semibold text-sand hover:bg-ink/90 transition shadow"
              >
                Proceed to Purchase Closing
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
