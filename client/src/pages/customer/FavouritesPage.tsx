import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { inr, imgSrc } from "../../lib/format";
import type { Property } from "../../types";

type FavItem = {
  id: string;
  propertyId?: string | null;
  ivyListingId?: string | null;
  property?: Property | null;
  title?: string;
  price?: number;
  locality?: string;
};

export default function FavouritesPage() {
  const [items, setItems] = useState<FavItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavs = async () => {
    setLoading(true);
    try {
      // Local favourites
      const res = await api.get<{ count: number; results: FavItem[] }>("/favourites");
      setItems(res.results || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFavs();
  }, []);

  const handleRemove = async (favId: string) => {
    try {
      await api.del(`/favourites/${favId}`);
      setItems((prev) => prev.filter((i) => i.id !== favId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to remove favourite");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="font-serif text-3xl font-bold">Saved Favourites</h1>
        <p className="text-sm text-ink/70">
          Your bookmarked homes and properties for future reference
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink/60">Loading saved properties...</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center space-y-4">
          <p className="font-serif text-xl font-bold">No saved properties yet</p>
          <p className="text-sm text-ink/70">
            Click the ♥ Save button on any listing to build your shortlist.
          </p>
          <Link
            to="/properties"
            className="inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-sand hover:bg-ink/90"
          >
            Explore Properties &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((fav) => {
            const p = fav.property;
            const targetId = fav.propertyId || fav.ivyListingId || fav.id;
            const title = p?.title || (fav.ivyListingId ? `Ivy MLS Listing #${fav.ivyListingId}` : "Saved Property");
            const price = p?.price;
            const locality = p?.locality;
            const image = p?.images?.[0]?.path;

            return (
              <article
                key={fav.id}
                className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm flex flex-col justify-between"
              >
                <Link to={`/properties/${targetId}`} className="block">
                  <img
                    src={imgSrc(image)}
                    alt=""
                    className="h-44 w-full object-cover"
                  />
                  <div className="p-4 space-y-1">
                    <p className="text-xs uppercase tracking-wider text-moss font-bold">
                      {p?.bhk ? `${p.bhk} BHK` : "Saved Home"}
                    </p>
                    <h3 className="font-serif text-lg font-bold line-clamp-1">{title}</h3>
                    {price != null && (
                      <p className="font-serif text-xl font-bold text-brass">{inr(price)}</p>
                    )}
                    {locality && (
                      <p className="text-xs text-ink/60 capitalize">📍 {locality}</p>
                    )}
                  </div>
                </Link>

                <div className="border-t border-ink/5 p-3 flex justify-between items-center bg-sand/10">
                  <Link
                    to={`/properties/${targetId}`}
                    className="text-xs font-semibold text-moss hover:underline"
                  >
                    View Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleRemove(fav.id)}
                    className="text-xs font-semibold text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
