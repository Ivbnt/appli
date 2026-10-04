import { NextResponse, type NextRequest } from "next/server";
import { getApiContext } from "@/server/auth/guards";
import { rateLimit } from "@/server/auth/rate-limit";
import { unauthorized } from "@/server/http";
import { MovieApiUnavailable, searchMovies } from "@/server/integrations/movies";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return unauthorized();
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 120) return NextResponse.json({ results: [] });
  const limit = await rateLimit(`movie-search:${ctx.user.id}`, 60, 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de recherches, patientez un instant." }, { status: 429 });
  try {
    return NextResponse.json({ results: await searchMovies(q) });
  } catch (error) {
    if (error instanceof MovieApiUnavailable) return NextResponse.json({ error: error.message, unavailable: true }, { status: 503 });
    console.error("[movies:search]", error);
    return NextResponse.json({ error: "Le service de films ne répond pas pour le moment." }, { status: 502 });
  }
}
