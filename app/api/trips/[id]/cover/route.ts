import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getApiContext } from "@/server/auth/guards";
import { rateLimit } from "@/server/auth/rate-limit";
import { jsonError, readUploadedFile, unauthorized } from "@/server/http";
import { processCover } from "@/server/media/images";
import { setTripCover } from "@/server/services/trips";

export async function POST(request: NextRequest, { params }: RouteContext<"/api/trips/[id]/cover">) {
  const ctx = await getApiContext();
  if (!ctx) return unauthorized();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  const limit = await rateLimit(`upload:${ctx.user.id}`, 600, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop d'imports." }, { status: 429 });
  try {
    const { buffer } = await readUploadedFile(request, 20 * 1024 * 1024);
    const url = await setTripCover(ctx.workspace.id, id, await processCover(buffer));
    revalidatePath("/trips", "layout");
    return NextResponse.json({ url });
  } catch (error) {
    return jsonError(error);
  }
}
