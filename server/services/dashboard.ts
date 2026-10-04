import "server-only";
import { addDays, startOfDayInstant, todayISO } from "@/lib/dates";
import { db, sql } from "../db";
import { fileUrl } from "../storage";
import { listOccurrences } from "./calendar";
import type { TaskRow } from "./tasks";

/** Choix stable pour la journée (même suggestion toute la journée, différente le lendemain). */
function dailyPick<T>(items: T[], salt: string): T | null {
  if (items.length === 0) return null;
  let hash = 0;
  for (const char of `${todayISO()}:${salt}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return items[hash % items.length]!;
}

export async function getDashboard(workspaceId: string) {
  const today = todayISO();
  const now = new Date();

  const [trip, occurrences, reservation, task, photo, watchlist, activities, counts] = await Promise.all([
    db.maybe<{ id: string; title: string; destination: string; startDate: string; endDate: string; coverKey: string | null }>(sql`
      SELECT id, title, destination, start_date, end_date, cover_key FROM trips
      WHERE workspace_id = ${workspaceId} AND end_date >= ${today} ORDER BY start_date LIMIT 1`),
    listOccurrences(workspaceId, now, startOfDayInstant(addDays(today, 60))),
    db.maybe<{ id: string; title: string; type: string; startsAt: Date; hasTime: boolean; location: string | null; origin: string | null; destination: string | null }>(sql`
      SELECT id, title, type, starts_at, has_time, location, origin, destination FROM reservations
      WHERE workspace_id = ${workspaceId} AND COALESCE(ends_at, starts_at) >= now() ORDER BY starts_at LIMIT 1`),
    db.maybe<TaskRow & { categoryName: string | null }>(sql`
      SELECT t.id, t.title, t.description, t.category_id, t.priority, t.status, t.due_date, t.assigned_to_id, t.created_by_id,
             t.position, t.completed_at, t.archived_at, t.created_at, t.updated_at, c.name AS category_name
      FROM tasks t LEFT JOIN task_categories c ON c.id = t.category_id
      WHERE t.workspace_id = ${workspaceId} AND t.archived_at IS NULL AND t.status <> 'done'
      ORDER BY t.due_date ASC NULLS LAST, CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.position
      LIMIT 1`),
    db.maybe<{ id: string; previewKey: string; dominantColor: string | null; description: string | null; location: string | null; takenAt: Date | null; createdAt: Date }>(sql`
      SELECT id, preview_key, dominant_color, description, location, taken_at, created_at FROM photos
      WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC LIMIT 1`),
    db.many<{ id: string; title: string; posterUrl: string | null; year: number | null; runtime: number | null; genres: string[] }>(sql`
      SELECT id, title, poster_url, year, runtime, genres FROM movies WHERE workspace_id = ${workspaceId} AND status = 'watchlist'
      ORDER BY created_at LIMIT 50`),
    db.many<{ id: string; label: string }>(sql`SELECT id, label FROM activities WHERE workspace_id = ${workspaceId} AND pool = 'tonight'`),
    db.one<{ openTasks: number; photos: number; places: number }>(sql`
      SELECT (SELECT count(*) FROM tasks WHERE workspace_id = ${workspaceId} AND archived_at IS NULL AND status <> 'done')::int AS open_tasks,
             (SELECT count(*) FROM photos WHERE workspace_id = ${workspaceId})::int AS photos,
             (SELECT count(*) FROM locations WHERE workspace_id = ${workspaceId})::int AS places`),
  ]);

  // Prochain événement « libre » (les voyages ont leur propre carte).
  const nextEvent = occurrences.find((o) => o.type !== "trip" && !o.reservationId) ?? null;
  const todayEvents = occurrences.filter((o) => o.occurrenceStart < startOfDayInstant(addDays(today, 1)));

  return {
    trip: trip ? { ...trip, coverUrl: await fileUrl(trip.coverKey) } : null,
    nextEvent,
    todayCount: todayEvents.length,
    reservation,
    task,
    photo: photo ? { ...photo, url: (await fileUrl(photo.previewKey))! } : null,
    movie: dailyPick(watchlist, "movie"),
    activity: dailyPick(activities, "activity"),
    counts,
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
