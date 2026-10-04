import { NextResponse } from "next/server";
import { db, sql } from "@/server/db";

export const dynamic = "force-dynamic";

/** Sonde de santé (Docker healthcheck) : vérifie aussi l'accès à PostgreSQL. */
export async function GET() {
  try {
    await db.exec(sql`SELECT 1`);
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
