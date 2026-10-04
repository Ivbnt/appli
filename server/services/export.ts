import "server-only";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { db, sql } from "../db";
import { storage } from "../storage";

/**
 * Export RGPD : une archive ZIP contenant toutes les données de l'espace (data.json),
 * les photos originales et les documents de réservation.
 */
export async function exportWorkspace(workspaceId: string, userId: string): Promise<ReadableStream<Uint8Array>> {
  const q = <T>(query: ReturnType<typeof sql>) => db.many<T>(query);
  const [account, workspace, members, places, categories, tasks, events, movies, reviews, trips, reservations, albums, photos, milestones, playlists, activities, challenges, quizzes, questions, answers, badges] =
    await Promise.all([
      db.one(sql`SELECT id, name, email, email_verified_at, theme_preference, email_notifications, reminder_emails, default_reminder_minutes, created_at FROM users WHERE id = ${userId}`),
      db.one(sql`SELECT id, name, together_since, created_at FROM workspaces WHERE id = ${workspaceId}`),
      q(sql`SELECT u.name, u.email, m.role, m.joined_at FROM workspace_members m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ${workspaceId}`),
      q(sql`SELECT * FROM locations WHERE workspace_id = ${workspaceId} ORDER BY created_at`),
      q(sql`SELECT id, name, slug, position FROM task_categories WHERE workspace_id = ${workspaceId}`),
      q(sql`SELECT * FROM tasks WHERE workspace_id = ${workspaceId} ORDER BY created_at`),
      q(sql`SELECT * FROM calendar_events WHERE workspace_id = ${workspaceId} ORDER BY start_date`),
      q(sql`SELECT * FROM movies WHERE workspace_id = ${workspaceId} ORDER BY created_at`),
      q(sql`SELECT r.* FROM movie_reviews r JOIN movies m ON m.id = r.movie_id WHERE m.workspace_id = ${workspaceId}`),
      q(sql`SELECT id, title, destination, start_date, end_date, description, latitude, longitude, created_at FROM trips WHERE workspace_id = ${workspaceId}`),
      q<{ id: string; documentKey: string | null; documentName: string | null }>(sql`SELECT * FROM reservations WHERE workspace_id = ${workspaceId} ORDER BY starts_at`),
      q(sql`SELECT id, title, description, cover_photo_id, created_at FROM albums WHERE workspace_id = ${workspaceId}`),
      q<{ id: string; storageKey: string; originalName: string }>(sql`
        SELECT id, album_id, storage_key, original_name, mime_type, size_bytes, width, height, description, taken_at, location,
               latitude, longitude, place_id, trip_id, created_at FROM photos WHERE workspace_id = ${workspaceId} ORDER BY created_at`),
      q(sql`SELECT * FROM milestones WHERE workspace_id = ${workspaceId}`),
      q(sql`SELECT spotify_id, url, name, description, tracks, last_synced_at FROM playlists WHERE workspace_id = ${workspaceId}`),
      q(sql`SELECT label, pool, done_count, last_done_at FROM activities WHERE workspace_id = ${workspaceId}`),
      q(sql`SELECT * FROM challenges WHERE workspace_id = ${workspaceId}`),
      q(sql`SELECT * FROM quizzes WHERE workspace_id = ${workspaceId}`),
      q(sql`SELECT q.* FROM quiz_questions q JOIN quizzes z ON z.id = q.quiz_id WHERE z.workspace_id = ${workspaceId}`),
      q(sql`SELECT a.* FROM quiz_answers a JOIN quiz_questions q ON q.id = a.question_id JOIN quizzes z ON z.id = q.quiz_id WHERE z.workspace_id = ${workspaceId}`),
      q(sql`SELECT b.name, ub.awarded_at FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.workspace_id = ${workspaceId}`),
    ]);

  const omit = <T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> => {
    const copy = { ...value };
    delete copy[key];
    return copy;
  };
  const photoFile = (p: { id: string; originalName: string }) => `photos/${p.id}-${p.originalName.replace(/[^\w.-]+/g, "_")}`;
  const documentFile = (r: { id: string; documentName: string | null }) => `documents/${r.id}-${(r.documentName ?? "document").replace(/[^\w.-]+/g, "_")}`;

  const data = {
    exportedAt: new Date().toISOString(),
    account,
    workspace,
    members,
    places,
    taskCategories: categories,
    tasks,
    calendarEvents: events,
    movies,
    movieReviews: reviews,
    trips,
    reservations: reservations.map(({ documentKey, ...r }) => ({ ...r, documentFile: documentKey ? documentFile(r) : null })),
    albums,
    photos: photos.map((p) => ({ ...omit(p, "storageKey"), file: photoFile(p) })),
    milestones,
    playlists,
    activities,
    challenges,
    quizzes,
    quizQuestions: questions,
    quizAnswers: answers,
    badges,
  };

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const output = new PassThrough();
  archive.on("error", (error: Error) => output.destroy(error));
  archive.pipe(output);
  archive.append(JSON.stringify(data, null, 2), { name: "data.json" });
  archive.append(
    "Export de votre espace.\n\n- data.json : toutes vos données (lieux, tâches, calendrier, films, voyages…)\n- photos/ : vos photos originales\n- documents/ : billets et confirmations\n",
    { name: "LISEZMOI.txt" },
  );

  // Les fichiers sont ajoutés en flux, un par un, sans tout charger en mémoire.
  void (async () => {
    try {
      for (const photo of photos) {
        const file = await storage().get(photo.storageKey);
        if (file) archive.append(Readable.fromWeb(file.body as import("node:stream/web").ReadableStream), { name: photoFile(photo) });
      }
      for (const reservation of reservations) {
        if (!reservation.documentKey) continue;
        const file = await storage().get(reservation.documentKey);
        if (file) archive.append(Readable.fromWeb(file.body as import("node:stream/web").ReadableStream), { name: documentFile(reservation) });
      }
      await archive.finalize();
    } catch (error) {
      output.destroy(error as Error);
    }
  })();

  return Readable.toWeb(output) as ReadableStream<Uint8Array>;
}
