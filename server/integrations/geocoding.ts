import "server-only";
import { env } from "../env";

export type GeocodeResult = { name: string; address: string; latitude: number; longitude: number };

const TIMEOUT = 8000;

/**
 * Géocodage (adresse → coordonnées) :
 * - MapTiler si MAP_API_KEY est défini ;
 * - sinon OpenStreetMap / Nominatim (gratuit, 1 requête/s, User-Agent identifiant obligatoire).
 * Les requêtes passent par le serveur : aucune clé n'est exposée et l'usage est limité.
 */
export async function geocode(query: string): Promise<GeocodeResult[]> {
  const key = env().MAP_API_KEY;
  if (key) {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&language=fr&limit=6`;
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) throw new Error(`MapTiler ${response.status}`);
    const data = (await response.json()) as { features: { text: string; place_name: string; center: [number, number] }[] };
    return data.features.map((f) => ({ name: f.text, address: f.place_name, longitude: f.center[0], latitude: f.center[1] }));
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=6&accept-language=fr&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { "User-Agent": userAgent() }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const data = (await response.json()) as { name?: string; display_name: string; lat: string; lon: string }[];
  return data.map((item) => ({
    name: item.name || item.display_name.split(",")[0]!,
    address: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  }));
}

/** Géocodage inverse (coordonnées → adresse), utilisé lorsqu'on choisit un point sur la carte. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
  const key = env().MAP_API_KEY;
  if (key) {
    const url = `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${key}&language=fr&limit=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) throw new Error(`MapTiler ${response.status}`);
    const data = (await response.json()) as { features: { text: string; place_name: string }[] };
    const first = data.features[0];
    return first ? { name: first.text, address: first.place_name, latitude, longitude } : null;
  }
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=fr&lat=${latitude}&lon=${longitude}`;
  const response = await fetch(url, { headers: { "User-Agent": userAgent() }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const data = (await response.json()) as { name?: string; display_name?: string; error?: string };
  if (data.error || !data.display_name) return null;
  return { name: data.name || data.display_name.split(",")[0]!, address: data.display_name, latitude, longitude };
}

function userAgent() {
  return env().GEOCODING_USER_AGENT ?? `Nous/1.0 (${new URL(env().APP_URL).host})`;
}

/** Styles de carte : MapTiler si une clé est fournie, sinon les fonds CARTO (sans clé). */
export function mapStyles(): { light: string; dark: string } {
  const key = env().MAP_API_KEY;
  if (key) {
    return {
      light: `https://api.maptiler.com/maps/dataviz/style.json?key=${key}`,
      dark: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${key}`,
    };
  }
  return {
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  };
}
