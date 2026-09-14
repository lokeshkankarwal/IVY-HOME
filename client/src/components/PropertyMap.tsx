import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import { inr } from "../lib/format";

// Fix Leaflet marker icons in bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type MapPoint = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  price?: number;
  href?: string;
};

export function PropertyMap({ points, center }: { points: MapPoint[]; center?: [number, number] }) {
  const c = center ?? (points[0] ? ([points[0].latitude, points[0].longitude] as [number, number]) : ([12.97, 77.59] as [number, number]));
  return (
    <MapContainer center={c} zoom={12} scrollWheelZoom className="h-[520px] w-full">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {points
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
        .map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <div className="min-w-40">
                <p className="font-semibold">{p.title}</p>
                {p.price != null && <p>{inr(p.price)}</p>}
                <Link className="text-moss underline" to={p.href ?? `/properties/${p.id}`}>
                  View details
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
