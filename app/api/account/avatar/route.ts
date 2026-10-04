import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { rateLimit } from "@/server/auth/rate-limit";
import { db, sql } from "@/server/db";
import { jsonError, readUploadedFile, unauthorized } from "@/server/http";
import { processAvatar } from "@/server/media/images";
import { fileUrl, flushFileDeletions, queueFileDeletion, storage, storageKeys } from "@/server/storage";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return unauthorized();
  const limit = await rateLimit(`avatar:${session.user.id}`, 20, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de changements, réessayez plus tard." }, { status: 429 });
  try {
    const { buffer } = await readUploadedFile(request, 10 * 1024 * 1024);
    const key = storageKeys.avatar(session.user.id);
    await storage().put(key, await processAvatar(buffer), "image/webp");
    const previous = await db.one<{ previousKey: string | null }>(sql`
      UPDATE users u SET avatar_key = ${key} FROM (SELECT avatar_key FROM users WHERE id = ${session.user.id}) old
      WHERE u.id = ${session.user.id} RETURNING old.avatar_key AS previous_key`);
    await queueFileDeletion([previous.previousKey]);
    flushFileDeletions();
    revalidatePath("/", "layout");
    return NextResponse.json({ url: await fileUrl(key) });
  } catch (error) {
    return jsonError(error);
  }
}
