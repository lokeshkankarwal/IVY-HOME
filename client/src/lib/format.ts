export function inr(n: number | undefined | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function imgSrc(path?: string | null) {
  if (!path) return "/defaults/apartment.svg";
  if (path.startsWith("http")) return path;
  return path;
}
