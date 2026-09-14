import { Link } from "react-router-dom";
import { imgSrc, inr } from "../lib/format";

type Props = {
  id: string;
  title: string;
  price?: number;
  locality?: string;
  bhk?: number;
  area?: number;
  image?: string;
  href?: string;
  onFav?: () => void;
  onCart?: () => void;
  sold?: boolean;
};

export function PropertyCard(p: Props) {
  return (
    <article className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
      <Link to={p.href ?? `/properties/${p.id}`} className="block">
        <img src={imgSrc(p.image)} alt="" className="h-44 w-full object-cover" />
        <div className="p-4">
          <p className="text-xs uppercase tracking-wide text-moss">{p.bhk != null ? `${p.bhk} BHK` : "Property"}</p>
          <h3 className="font-serif text-lg">{p.title}</h3>
          <p className="text-brass font-semibold">{p.sold ? "SOLD" : inr(p.price)}</p>
          <p className="text-sm text-ink/70">
            {p.locality}
            {p.area ? ` · ${p.area} sq ft` : ""}
          </p>
        </div>
      </Link>
      {(p.onFav || p.onCart) && (
        <div className="flex gap-2 border-t border-ink/5 px-4 py-3 text-sm">
          {p.onFav && (
            <button type="button" onClick={p.onFav} className="rounded-full border px-3 py-1">
              ♥ Save
            </button>
          )}
          {p.onCart && !p.sold && (
            <button type="button" onClick={p.onCart} className="rounded-full bg-ink px-3 py-1 text-sand">
              Add to cart
            </button>
          )}
        </div>
      )}
    </article>
  );
}
