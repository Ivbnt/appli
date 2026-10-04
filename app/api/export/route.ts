import { NextResponse } from "next/server";
import { todayISO } from "@/lib/dates";
import { getApiContext } from "@/server/auth/guards";
import { rateLimit } from "@/server/auth/rate-limit";
import { unauthorized } from "@/server/http";
import { exportWorkspace } from "@/server/services/export";

export const maxDuration = 300;

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return unauthorized();
  const limit = await rateLimit(`export:${ctx.user.id}`, 5, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ error: "Trop d'exports, réessayez dans une heure." }, { status: 429 });
  const stream = await exportWorkspace(ctx.workspace.id, ctx.user.id);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="export-${todayISO()}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
