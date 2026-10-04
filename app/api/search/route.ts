import { NextResponse, type NextRequest } from "next/server";
import { getApiContext } from "@/server/auth/guards";
import { rateLimit } from "@/server/auth/rate-limit";
import { searchWorkspace } from "@/server/services/search";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const limit = await rateLimit(`search:${ctx.user.id}`, 120, 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const results = await searchWorkspace(ctx.workspace.id, q);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
}
