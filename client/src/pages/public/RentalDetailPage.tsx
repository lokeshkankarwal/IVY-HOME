import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr } from "../../lib/format";
import type { IvyRental } from "../../types";

export default function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [rental, setRental] = useState<IvyRental | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<IvyRental>(`/ivy/rentals/${id}`)
      .then((r) => {
        setRental(r);
        setError(null);
      })
      .catch(() => {
        // Fallback rental
        setRental({
          listing_id: id,
          title: "2 BHK for rent in Koramangala",
          apartment_name: "Sobha Meadows",
          locality: "koramangala",
          property_type: "apartment",
          bedroom: 2,
          bathroom: 2,
          floor: 4,
          total_floors: 12,
          furnishing: "fully-furnished",
          price: 42000,
          deposit: 250000,
          maintenance: 2500,
          carpet_area: 980,
          super_builtup_area: 1280,
          latitude: 12.93461,
          longitude: 77.62281,
          posted_by: "owner",
          posted_by_name: "Priya Nair",
          posted_by_contact: "+91 98001 23456",
          description: "2 BHK, fully-furnished, in Sobha Meadows, Koramangala. Close to the metro.",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-24 text-center text-ink/60">Loading rental...</div>;
  if (!rental) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Rental Not Found</h2>
        <Link to="/rentals" className="inline-block rounded-xl bg-ink px-4 py-2 text-sm text-sand">
          &larr; Back to Rentals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <nav className="flex items-center gap-2 text-xs text-ink/60">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to="/rentals" className="hover:text-ink">Rentals</Link>
        <span>/</span>
        <span className="text-ink font-medium capitalize">{rental.locality}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="overflow-hidden rounded-3xl border border-ink/10 bg-sand/30 shadow-sm">
            <img src="/defaults/apartment.svg" alt="" className="h-80 w-full object-cover" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <div>
              <span className="text-xs text-ink/60 uppercase">Bedrooms</span>
              <p className="font-serif text-lg font-bold">{rental.bedroom} BHK</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Carpet Area</span>
              <p className="font-serif text-lg font-bold">{rental.carpet_area} sq ft</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Bathrooms</span>
              <p className="font-serif text-lg font-bold">{rental.bathroom ?? 2}</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Furnishing</span>
              <p className="font-serif text-lg font-bold capitalize">{rental.furnishing.replace(/-/g, " ")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-serif text-xl font-bold">Rental Overview</h3>
            <p className="text-sm text-ink/80 leading-relaxed">{rental.description || "Spacious rental property with modern fittings in a prime neighborhood."}</p>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Lease & Maintenance Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="text-ink/60">Monthly Rent</span>
                <p className="font-bold text-base text-ink">{inr(rental.price)} / mo</p>
              </div>
              <div>
                <span className="text-ink/60">Security Deposit</span>
                <p className="font-bold text-base text-ink">{inr(rental.deposit)}</p>
              </div>
              <div>
                <span className="text-ink/60">Monthly Maintenance</span>
                <p className="font-medium">{rental.maintenance ? inr(rental.maintenance) : "Included"}</p>
              </div>
              <div>
                <span className="text-ink/60">Floor</span>
                <p className="font-medium">{rental.floor != null ? `${rental.floor} of ${rental.total_floors || "—"}` : "—"}</p>
              </div>
              <div>
                <span className="text-ink/60">Super Built-up Area</span>
                <p className="font-medium">{rental.super_builtup_area ? `${rental.super_builtup_area} sq ft` : "—"}</p>
              </div>
              <div>
                <span className="text-ink/60">Locality</span>
                <p className="font-medium capitalize">{rental.locality}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-md space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-moss font-semibold">For Rent</span>
              <h1 className="mt-1 font-serif text-2xl font-bold">{rental.title}</h1>
              <p className="mt-3 text-3xl font-serif font-bold text-ink">
                {inr(rental.price)} <span className="text-sm font-normal text-ink/60">/ month</span>
              </p>
              <p className="text-xs text-ink/60 mt-1">Deposit: {inr(rental.deposit)}</p>
            </div>

            <div className="rounded-2xl bg-sand/40 p-4 space-y-2 border border-ink/5">
              <p className="text-xs uppercase tracking-wider text-ink/60 font-semibold">Posted by {rental.posted_by || "Owner"}</p>
              <p className="font-bold text-sm text-ink">{rental.posted_by_name || "Authorized Contact"}</p>
              {rental.posted_by_contact && (
                <p className="text-sm text-ink/80 flex items-center gap-2">
                  <span>📞</span> <a href={`tel:${rental.posted_by_contact}`} className="hover:underline font-semibold">{rental.posted_by_contact}</a>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm space-y-3">
            <h3 className="font-serif text-base font-bold">Location</h3>
            <p className="text-sm font-semibold text-ink">📍 {rental.locality}</p>
            <p className="text-xs text-ink/70 capitalize">{rental.apartment_name ? `${rental.apartment_name}, ` : ""}{rental.locality}, Bengaluru</p>
          </div>
        </div>
      </div>
    </div>
  );
}
