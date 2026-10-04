import { NextResponse, type NextRequest } from "next/server";
import { getApiContext } from "@/server/auth/guards";
import { rateLimit } from "@/server/auth/rate-limit";
import { reverseGeocode } from "@/server/integrations/geocoding";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Coordonnées invalides" }, { status: 400 });
  }
  const limit = await rateLimit(`geocode:${ctx.workspace.id}`, 40, 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  try {
    return NextResponse.json({ result: await reverseGeocode(lat, lng) });
  } catch (error) {
    console.error("[geocode:reverse]", error);
    return NextResponse.json({ result: null, error: "Adresse indisponible" }, { status: 502 });
  }
}
