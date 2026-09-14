import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr, imgSrc } from "../../lib/format";
import { useAuth } from "../../auth";
import type { Property, IvyListing } from "../../types";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalized property details
  const [item, setItem] = useState<{
    id: string;
    title: string;
    description: string;
    price: number;
    carpetArea: number;
    superBuiltUpArea?: number;
    bhk: number;
    bathrooms?: number;
    balconies?: number;
    floor?: number;
    totalFloors?: number;
    facing?: string;
    parking?: number;
    furnishing: string;
    locality: string;
    city: string;
    address?: string;
    latitude: number;
    longitude: number;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    status?: string;
    views?: number;
    images: string[];
    isPlatform: boolean;
  } | null>(null);

  const [activeImage, setActiveImage] = useState<string>("");
  const [similar, setSimilar] = useState<IvyListing[]>([]);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Visit modal state
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [submittingVisit, setSubmittingVisit] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    // Try local platform first
    api
      .get<Property>(`/properties/${id}`)
      .then((p) => {
        const imgs = p.images?.length
          ? p.images.map((i) => i.path)
          : [imgSrc(p.primaryImage)];
        setItem({
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price,
          carpetArea: p.carpetArea,
          superBuiltUpArea: p.superBuiltUpArea,
          bhk: p.bhk,
          bathrooms: p.bathrooms,
          floor: p.floor,
          totalFloors: p.totalFloors,
          parking: p.parking,
          furnishing: p.furnishing,
          locality: p.locality,
          city: p.city,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          contactName: p.seller?.name || p.contactName,
          contactPhone: p.seller?.phone || p.contactPhone,
          contactEmail: p.seller?.email,
          status: p.status,
          views: p.views,
          images: imgs,
          isPlatform: true,
        });
        setActiveImage(imgs[0] || "");
      })
      .catch(() => {
        // If not found in platform, try Ivy API
        api
          .get<IvyListing>(`/ivy/listings/${id}`)
          .then((iv) => {
            const defaultImg = "/defaults/apartment.svg";
            setItem({
              id: iv.listing_id,
              title: iv.apartment_name
                ? `${iv.bedroom} BHK in ${iv.apartment_name}`
                : `${iv.bedroom} BHK ${iv.property_type || "Apartment"} in ${iv.locality}`,
              description: iv.description || "Well appointed home in prime Bangalore locality.",
              price: iv.price,
              carpetArea: iv.carpet_area,
              superBuiltUpArea: iv.super_built_up_area,
              bhk: iv.bedroom,
              bathrooms: iv.bathroom,
              balconies: iv.balcony,
              floor: iv.floor,
              totalFloors: iv.total_floors,
              facing: iv.facing_direction,
              parking: iv.covered_parking,
              furnishing: iv.furnishing,
              locality: iv.locality,
              city: "Bengaluru",
              latitude: iv.latitude,
              longitude: iv.longitude,
              contactName: iv.posted_by_name || "Verified Agent",
              contactPhone: iv.posted_by_contact || "+91 80 4567 8900",
              status: "ACTIVE",
              images: [defaultImg],
              isPlatform: false,
            });
            setActiveImage(defaultImg);

            // Fetch similar listings
            api
              .get<{ results?: IvyListing[] }>(`/ivy/listings/${id}/similar`)
              .then((s) => setSimilar(s.results || []))
              .catch(() => {});
          })
          .catch((err: Error) => {
            setError(err.message || "Property not found");
          });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFav = async () => {
    if (!user) {
      setActionMsg("Please log in to save favourites.");
      return;
    }
    if (!item) return;
    try {
      if (item.isPlatform) {
        await api.post("/favourites", { propertyId: item.id });
      } else {
        await api.post("/ivy/favourites", { id: item.id });
      }
      setActionMsg("Saved to favourites!");
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "Failed to save favourite");
    }
  };

  const handleCart = async () => {
    if (!user) {
      setActionMsg("Please log in to add to cart.");
      return;
    }
    if (!item || !item.isPlatform) {
      setActionMsg("Only verified platform direct properties can be added to the transactional cart.");
      return;
    }
    try {
      await api.post("/cart", { propertyId: item.id });
      setActionMsg("Added property to cart!");
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "Failed to add to cart");
    }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setActionMsg("Please log in to schedule a visit.");
      setShowVisitModal(false);
      return;
    }
    if (!item || !visitDate) return;
    setSubmittingVisit(true);
    try {
      if (item.isPlatform) {
        await api.post("/visits/request", {
          propertyId: item.id,
          scheduledAt: new Date(visitDate).toISOString(),
          notes: visitNotes,
        });
      }
      setActionMsg("Visit scheduled successfully! The seller will contact you shortly.");
      setShowVisitModal(false);
      setVisitDate("");
      setVisitNotes("");
    } catch (e: unknown) {
      setActionMsg(e instanceof Error ? e.message : "Failed to schedule visit");
    } finally {
      setSubmittingVisit(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-ink/60">Loading property details...</div>;
  }

  if (error || !item) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Property Not Found</h2>
        <p className="text-sm text-ink/70">{error || "The requested property could not be located."}</p>
        <Link to="/properties" className="inline-block rounded-xl bg-ink px-4 py-2 text-sm text-sand">
          &larr; Back to Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-ink/60">
        <Link to="/" className="hover:text-ink">
          Home
        </Link>
        <span>/</span>
        <Link to="/properties" className="hover:text-ink">
          Properties
        </Link>
        <span>/</span>
        <span className="text-ink font-medium capitalize">{item.locality}</span>
      </nav>

      {actionMsg && (
        <div className="rounded-xl bg-moss/10 border border-moss/20 px-4 py-3 text-sm text-moss font-semibold">
          {actionMsg}
        </div>
      )}

      {/* Main Hero & Gallery Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Gallery */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-sand/30 shadow-md">
            <img
              src={imgSrc(activeImage)}
              alt={item.title}
              className="h-[380px] sm:h-[460px] w-full object-cover"
            />
            {item.status === "SOLD" && (
              <span className="absolute top-4 right-4 rounded-xl bg-ink px-4 py-1.5 text-sm font-bold text-sand shadow">
                SOLD
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {item.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {item.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    activeImage === img ? "border-brass shadow" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={imgSrc(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Key Specs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <div>
              <span className="text-xs text-ink/60 uppercase">Bedrooms</span>
              <p className="font-serif text-lg font-bold">{item.bhk} BHK</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Carpet Area</span>
              <p className="font-serif text-lg font-bold">{item.carpetArea} sq ft</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Bathrooms</span>
              <p className="font-serif text-lg font-bold">{item.bathrooms ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-ink/60 uppercase">Furnishing</span>
              <p className="font-serif text-lg font-bold capitalize">
                {item.furnishing.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Full Description */}
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm space-y-3">
            <h3 className="font-serif text-xl font-bold">About this home</h3>
            <p className="whitespace-pre-line text-sm text-ink/80 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Detailed Features Table */}
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-xl font-bold">Property Specifications</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="text-ink/60">Super Built-up Area</span>
                <p className="font-medium">{item.superBuiltUpArea ? `${item.superBuiltUpArea} sq ft` : "—"}</p>
              </div>
              <div>
                <span className="text-ink/60">Floor</span>
                <p className="font-medium">
                  {item.floor != null ? `${item.floor} of ${item.totalFloors || "—"}` : "—"}
                </p>
              </div>
              <div>
                <span className="text-ink/60">Facing Direction</span>
                <p className="font-medium capitalize">{item.facing || "North-East"}</p>
              </div>
              <div>
                <span className="text-ink/60">Covered Parking</span>
                <p className="font-medium">{item.parking != null ? `${item.parking} slots` : "Available"}</p>
              </div>
              <div>
                <span className="text-ink/60">Locality</span>
                <p className="font-medium capitalize">{item.locality}</p>
              </div>
              <div>
                <span className="text-ink/60">Views</span>
                <p className="font-medium">{item.views ?? 1}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions & Seller Contact */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-md space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-moss font-semibold">
                {item.isPlatform ? "Verified Direct Listing" : "Ivy MLS Partner Listing"}
              </span>
              <h1 className="mt-1 font-serif text-2xl font-bold leading-snug">{item.title}</h1>
              <p className="mt-2 text-3xl font-serif font-bold text-brass">
                {item.status === "SOLD" ? "SOLD" : inr(item.price)}
              </p>
              {item.carpetArea > 0 && (
                <p className="text-xs text-ink/60">
                  ≈ {inr(Math.round(item.price / item.carpetArea))} / sq ft
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {user?.role === "SELLER" ? (
              <div className="rounded-2xl border border-ink/10 bg-sand/40 p-4 text-center space-y-2">
                <span className="inline-block rounded-full bg-ink/10 px-3 py-1 text-xs font-bold text-ink">
                  Seller Portal View
                </span>
                <p className="text-xs text-ink/70">
                  You are logged in with a Seller account. Customer actions (cart, visit requests, favorites) are disabled.
                </p>
                <Link
                  to="/seller/properties"
                  className="inline-block rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-sand hover:bg-ink/90 transition mt-1"
                >
                  Manage My Inventory &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setShowVisitModal(true)}
                  className="w-full rounded-xl bg-ink py-3 font-semibold text-sand shadow hover:bg-ink/90 transition"
                >
                  Schedule Property Visit
                </button>

                {item.isPlatform && item.status !== "SOLD" && (
                  <button
                    onClick={() => void handleCart()}
                    className="w-full rounded-xl border-2 border-ink py-3 font-semibold text-ink hover:bg-ink/5 transition"
                  >
                    Add to Cart
                  </button>
                )}

                <button
                  onClick={() => void handleFav()}
                  className="w-full rounded-xl border border-ink/20 py-2.5 text-sm font-semibold text-ink/80 hover:bg-ink/5 transition"
                >
                  ♥ Save to Favourites
                </button>
              </div>
            )}

            {/* Contact Details Card */}
            <div className="rounded-2xl bg-sand/40 p-4 space-y-2 border border-ink/5">
              <p className="text-xs uppercase tracking-wider text-ink/60 font-semibold">Contact Representative</p>
              <p className="font-bold text-sm text-ink">{item.contactName || "Ivy Homes Associate"}</p>
              {item.contactPhone && (
                <p className="text-sm text-ink/80 flex items-center gap-2">
                  <span>📞</span> <a href={`tel:${item.contactPhone}`} className="hover:underline">{item.contactPhone}</a>
                </p>
              )}
              {item.contactEmail && (
                <p className="text-sm text-ink/80 flex items-center gap-2">
                  <span>✉️</span> <a href={`mailto:${item.contactEmail}`} className="hover:underline">{item.contactEmail}</a>
                </p>
              )}
            </div>
          </div>

          {/* Location Details (Keywords/Address only - Map removed) */}
          <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm space-y-3">
            <h3 className="font-serif text-base font-bold">Location &amp; Address</h3>
            <p className="text-sm font-semibold text-ink">📍 {item.locality}, {item.city}</p>
            {item.address && (
              <p className="text-xs text-ink/70">{item.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">Book a Property Visit</h3>
              <button
                onClick={() => setShowVisitModal(false)}
                className="text-xl text-ink/50 hover:text-ink"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-ink/70">
              Pick a date and time to visit {item.title}. The assigned representative will coordinate access.
            </p>

            <form onSubmit={handleScheduleVisit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Visit Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1">Notes / Preferences (Optional)</label>
                <textarea
                  rows={3}
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="e.g. Afternoon visit preferred, checking floor plan."
                  className="w-full rounded-xl border border-ink/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVisit}
                  className="rounded-xl bg-ink px-5 py-2 text-sm font-semibold text-sand hover:bg-ink/90 disabled:opacity-50"
                >
                  {submittingVisit ? "Scheduling..." : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Similar Listings */}
      {similar.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-ink/10">
          <h3 className="font-serif text-2xl font-bold">Similar Homes You May Like</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.slice(0, 3).map((sim) => (
              <div
                key={sim.listing_id}
                className="overflow-hidden rounded-2xl border border-ink/10 bg-white p-4 shadow-sm space-y-2"
              >
                <Link to={`/properties/${sim.listing_id}`} className="block">
                  <p className="text-xs uppercase text-moss font-bold">{sim.bedroom} BHK</p>
                  <h4 className="font-serif text-base font-semibold">{sim.apartment_name || sim.locality}</h4>
                  <p className="text-brass font-bold">{inr(sim.price)}</p>
                  <p className="text-xs text-ink/60">{sim.carpet_area} sq ft · {sim.locality}</p>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
