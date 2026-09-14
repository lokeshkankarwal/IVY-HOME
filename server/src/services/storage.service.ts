import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");

export function ensureUploadDir() {
  fs.mkdirSync(root, { recursive: true });
}

export function saveLocalFile(filename: string, buffer: Buffer) {
  ensureUploadDir();
  const dest = path.join(root, filename);
  fs.writeFileSync(dest, buffer);
  return `/uploads/${filename}`;
}

export function deleteLocalFile(publicPath: string) {
  const name = path.basename(publicPath);
  const dest = path.join(root, name);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
}

export function defaultImageForType(type: string) {
  const map: Record<string, string> = {
    APARTMENT: "/defaults/apartment.svg",
    VILLA: "/defaults/villa.svg",
    INDEPENDENT_HOUSE: "/defaults/house.svg",
    PLOT: "/defaults/plot.svg",
    BUILDER_FLOOR: "/defaults/apartment.svg",
  };
  return map[type] ?? "/defaults/apartment.svg";
}

export const uploadRoot = root;
