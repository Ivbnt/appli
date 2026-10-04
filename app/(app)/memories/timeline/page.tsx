import type { Metadata } from "next";
import { TimelineView } from "@/components/photos/timeline-view";
import { requireWorkspace } from "@/server/auth/guards";
import { db, sql } from "@/server/db";
import { fileUrl } from "@/server/storage";
import { listMilestones, listPhotos } from "@/server/services/photos";

export const metadata: Metadata = { title: "Moments" };

export default async function TimelinePage() {
  const ctx = await requireWorkspace();
  const [milestones, tripRows, { photos }] = await Promise.all([
    listMilestones(ctx.workspace.id),
    db.many<{ id: string; title: string; destination: string; startDate: string; endDate: string; coverKey: string | null }>(sql`
      SELECT id, title, destination, start_date, end_date, cover_key FROM trips
      WHERE workspace_id = ${ctx.workspace.id} AND start_date <= current_date ORDER BY start_date DESC`),
    listPhotos(ctx.workspace.id, {}, { limit: 60 }),
  ]);
  const trips = await Promise.all(tripRows.map(async ({ coverKey, ...trip }) => ({ ...trip, coverUrl: await fileUrl(coverKey) })));

  return <TimelineView milestones={milestones} trips={trips} togetherSince={ctx.workspace.togetherSince} photos={photos} />;
}
