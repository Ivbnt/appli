import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/server/auth/crypto";
import { getApiContext } from "@/server/auth/guards";
import { exchangeCode, saveConnection } from "@/server/integrations/spotify";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.redirect(new URL("/login", request.url));

  const params = request.nextUrl.searchParams;
  const store = await cookies();
  const expected = store.get("appli_spotify_state")?.value;
  store.delete({ name: "appli_spotify_state", path: "/api/spotify" });

  const state = params.get("state");
  const code = params.get("code");
  // Le paramètre `state` protège contre les attaques CSRF sur le retour OAuth.
  if (!expected || !state || !safeEqual(expected, state)) return NextResponse.redirect(new URL("/playlist?error=state", request.url));
  if (params.get("error") || !code) return NextResponse.redirect(new URL("/playlist?error=denied", request.url));

  try {
    await saveConnection(ctx.workspace.id, ctx.user.id, await exchangeCode(code));
  } catch (error) {
    console.error("[spotify:callback]", error);
    return NextResponse.redirect(new URL("/playlist?error=exchange", request.url));
  }
  return NextResponse.redirect(new URL("/playlist?connected=1", request.url));
}
