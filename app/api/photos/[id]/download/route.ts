import { NextResponse, type NextRequest } from "next/server";
import { getApiContext } from "@/server/auth/guards";
import { unauthorized } from "@/server/http";
import { originalDownloadUrl } from "@/server/services/photos";

/** Téléchargement de l'original : redirection vers une URL signée à durée limitée. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/photos/[id]/download">) {
  const ctx = await getApiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;
  const url = /^[0-9a-f-]{36}$/i.test(id) ? await originalDownloadUrl(ctx.workspace.id, id) : null;
  if (!url) return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
  return NextResponse.redirect(new URL(url, request.url));
}
