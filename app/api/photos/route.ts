import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getApiContext } from "@/server/auth/guards";
import { rateLimit } from "@/server/auth/rate-limit";
import { env } from "@/server/env";
import { jsonError, optionalId, readUploadedFile, unauthorized } from "@/server/http";
import { evaluateBadges } from "@/server/services/badges";
import { listPhotos, uploadPhoto } from "@/server/services/photos";

export const maxDuration = 60;

/** Import d'une photo (une par requête : progression précise et mémoire maîtrisée). */
export async function POST(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return unauthorized();
  const limit = await rateLimit(`upload:${ctx.user.id}`, 600, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop d'imports, réessayez dans un moment." }, { status: 429 });

  try {
    const { file, buffer, form } = await readUploadedFile(request, env().MAX_UPLOAD_MB * 1024 * 1024);
    const photo = await uploadPhoto(ctx.workspace.id, ctx.user.id, { buffer, name: file.name || "photo" }, {
      albumId: optionalId(form.get("albumId")),
      placeId: optionalId(form.get("placeId")),
      tripId: optionalId(form.get("tripId")),
    });
    await evaluateBadges(ctx.workspace.id);
    revalidatePath("/memories", "layout");
    revalidatePath("/");
    return NextResponse.json({ photo });
  } catch (error) {
    return jsonError(error);
  }
}

/** Page suivante de photos (défilement infini). */
export async function GET(request: NextRequest) {
  const ctx = await getApiContext();
  if (!ctx) return unauthorized();
  const params = request.nextUrl.searchParams;
  const result = await listPhotos(
    ctx.workspace.id,
    { albumId: optionalId(params.get("albumId")), placeId: optionalId(params.get("placeId")), tripId: optionalId(params.get("tripId")) },
    { cursor: params.get("cursor"), limit: 120 },
  );
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
