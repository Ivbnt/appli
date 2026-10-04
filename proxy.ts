import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["__Host-appli_session", "appli_session"];
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

/** Pages accessibles sans être connecté. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Vérification « optimiste » : redirige vers la connexion s'il n'y a aucun cookie de session.
 * La véritable vérification (session valide, appartenance à l'espace) est toujours faite
 * côté serveur, dans chaque page, action et route d'API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const cookieName = SESSION_COOKIES.find((name) => request.cookies.has(name));
  const token = cookieName ? request.cookies.get(cookieName)?.value : undefined;

  if (!token && !isPublic(pathname)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Expiration glissante du cookie, en phase avec la session en base.
  if (token && cookieName && request.method === "GET") {
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: cookieName.startsWith("__Host-"),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Tout sauf l'API (protégée par ses propres contrôles), les assets et les fichiers statiques.
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt).*)",
  ],
};
