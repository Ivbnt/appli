import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { resolveWorkspaceContext } from "@/server/auth/guards";
import { storage } from "@/server/storage";
import { keyOwner } from "@/server/storage/keys";
import { verifyFileUrl } from "@/server/storage/signing";

/**
 * Distribution des fichiers privés (stockage local).
 * Double contrôle : signature HMAC valide (URL émise par le serveur, à durée limitée)
 * ET session dont l'espace (ou l'utilisateur) possède le fichier.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/files/[...key]">) {
  const { key: segments } = await params;
  const key = segments.join("/");
  const search = request.nextUrl.searchParams;
  const download = search.get("dl");

  if (!verifyFileUrl(key, search.get("exp"), search.get("sig"), download)) {
    return new NextResponse("Lien expiré ou invalide", { status: 403 });
  }

  const session = await getCurrentSession();
  if (!session) return new NextResponse("Non authentifié", { status: 401 });
  const owner = keyOwner(key);
  const ctx = await resolveWorkspaceContext(session);
  const allowed =
    (owner?.kind === "workspace" && ctx?.workspace.id === owner.id) ||
    (owner?.kind === "user" && (owner.id === session.user.id || ctx?.members.some((m) => m.id === owner.id)));
  if (!allowed) return new NextResponse("Accès refusé", { status: 403 });

  const file = await storage().get(key);
  if (!file) return new NextResponse("Fichier introuvable", { status: 404 });

  const headers = new Headers({
    "Content-Type": file.contentType,
    "Content-Length": String(file.size),
    // Les clés sont immuables : le cache privé du navigateur peut les conserver.
    "Cache-Control": "private, max-age=3600, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  });
  if (download) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(download)}`);
  else headers.set("Content-Disposition", "inline");
  return new NextResponse(file.body, { headers });
}
