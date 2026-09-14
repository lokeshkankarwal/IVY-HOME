import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr, imgSrc } from "../../lib/format";
import type { Property } from "../../types";

type Order = {
  id: string;
  customerId: string;
  propertyId: string;
  status: string;
  soldPrice: number;
  createdAt: string;
  property: Property;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ results: Order[] }>("/orders/mine")
      .then((d) => setOrders(d.results || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold">My Orders &amp; Purchases</h1>
        <p className="text-sm text-ink/70">
          Official real estate purchase orders and title closing history
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading purchase orders...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center space-y-4">
          <p className="font-serif text-xl font-bold">No purchase orders found</p>
          <p className="text-sm text-ink/70">
            Properties marked as sold to your account will appear here.
          </p>
          <Link
            to="/properties"
            className="inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-sand hover:bg-ink/90"
          >
            Browse Properties &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const p = order.property;
            return (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row items-center gap-5 rounded-3xl border border-ink/10 bg-white p-5 shadow-sm"
              >
                <img
                  src={imgSrc(p?.images?.[0]?.path)}
                  alt=""
                  className="h-32 w-full sm:w-44 rounded-2xl object-cover"
                />
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="rounded-full bg-ink text-sand text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wide">
                      {order.status}
                    </span>
                    <span className="text-xs text-ink/50">
                      Ordered on {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold">{p?.title || "Property"}</h3>
                  <p className="text-xs text-ink/70">
                    {p?.locality}, {p?.city} · {p?.bhk} BHK ({p?.carpetArea} sq ft)
                  </p>
                  <p className="font-serif text-xl font-bold text-brass pt-1">
                    Closed at {inr(order.soldPrice)}
                  </p>
                </div>
                <div>
                  <Link
                    to={`/properties/${order.propertyId}`}
                    className="rounded-xl border border-ink/20 px-4 py-2 text-xs font-semibold text-ink hover:bg-sand"
                  >
                    View Property Record
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
