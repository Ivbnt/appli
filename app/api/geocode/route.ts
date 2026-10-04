import { NextResponse, type NextRequest } from "next/server";
import { getApiContext } from "@/server/auth/guards";
import { rateLimit } from "@/server/auth/rate-limit";
import { geocode } from "@/server/integrations/geocoding";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 200) return NextResponse.json({ results: [] });

  // Nominatim impose au maximum ~1 requête par seconde.
  const limit = await rateLimit(`geocode:${ctx.workspace.id}`, 40, 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de recherches, patientez un instant." }, { status: 429 });

  try {
    return NextResponse.json({ results: await geocode(q) });
  } catch (error) {
    console.error("[geocode]", error);
    return NextResponse.json({ error: "Le service de recherche d'adresses est momentanément indisponible." }, { status: 502 });
  }
}
