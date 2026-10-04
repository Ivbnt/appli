import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getApiContext } from "@/server/auth/guards";
import { rateLimit } from "@/server/auth/rate-limit";
import { UserError } from "@/server/errors";
import { jsonError, readUploadedFile, unauthorized } from "@/server/http";
import { isPdf } from "@/server/media/images";
import { reservationDocumentUrl, setReservationDocument } from "@/server/services/trips";

const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/** Joindre un billet ou une confirmation : PDF ou image (vérifiés par leur contenu réel). */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/reservations/[id]/document">) {
  const ctx = await getApiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  const limit = await rateLimit(`upload:${ctx.user.id}`, 600, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop d'imports." }, { status: 429 });

  try {
    const { file, buffer } = await readUploadedFile(request, 20 * 1024 * 1024);
    let mime: string;
    let ext: string;
    if (isPdf(buffer)) {
      mime = "application/pdf";
      ext = "pdf";
    } else {
      const format = await sharp(buffer).metadata().then((m) => m.format).catch(() => null);
      if (format === "jpeg") [mime, ext] = ["image/jpeg", "jpg"];
      else if (format === "png") [mime, ext] = ["image/png", "png"];
      else if (format === "webp") [mime, ext] = ["image/webp", "webp"];
      else throw new UserError("Formats acceptés : PDF, JPEG, PNG ou WebP.");
    }
    await setReservationDocument(ctx.workspace.id, id, { buffer, name: file.name || `document.${ext}`, mime, ext });
    revalidatePath("/trips", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

/** Ouvre (ou télécharge avec ?download=1) le document via une URL signée. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/reservations/[id]/document">) {
  const ctx = await getApiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;
  const url = validId(id) ? await reservationDocumentUrl(ctx.workspace.id, id, !request.nextUrl.searchParams.has("download")) : null;
  if (!url) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  return NextResponse.redirect(new URL(url, request.url));
}
