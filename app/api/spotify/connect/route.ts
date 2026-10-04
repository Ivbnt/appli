import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { generateToken } from "@/server/auth/crypto";
import { getApiContext } from "@/server/auth/guards";
import { env, integrations } from "@/server/env";
import { authorizeUrl } from "@/server/integrations/spotify";

/** Démarre l'autorisation OAuth Spotify (lecture des playlists uniquement). */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.redirect(new URL("/login", request.url));
  if (!integrations.spotify()) return NextResponse.redirect(new URL("/playlist?error=config", request.url));

  const state = generateToken(24);
  (await cookies()).set("appli_spotify_state", state, {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/api/spotify",
    maxAge: 600,
  });
  return NextResponse.redirect(authorizeUrl(state));
}
