import "server-only";
import { db, sql } from "../db";
import { flushFileDeletions, queueFileDeletion } from "../storage";
import { seedWorkspaceDefaults, whoLibraryKey } from "./defaults";
import { collectWorkspaceFileKeys } from "./files";

export async function updateWorkspace(workspaceId: string, input: { name: string; togetherSince: string | null }) {
  await db.exec(sql`
    UPDATE workspaces SET name = ${input.name}, together_since = ${input.togetherSince} WHERE id = ${workspaceId}`);
}

/** Efface tout le contenu de l'espace (souvenirs, lieux, tâches…) en conservant l'espace et ses membres. */
export async function deleteWorkspaceContent(workspaceId: string, userId: string): Promise<void> {
  await db.tx(async (tx) => {
    await tx.exec(sql`SELECT id FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`);
    await queueFileDeletion(await collectWorkspaceFileKeys(tx, workspaceId), tx);
    for (const table of [
      "reminders", "calendar_events", "photos", "albums", "milestones", "locations", "reservations", "trips",
      "tasks", "task_categories", "movies", "playlists", "spotify_connections", "activities",
      "quizzes", "user_badges",
    ]) {
      await tx.exec(sql`DELETE FROM ${sql.raw(table)} WHERE workspace_id = ${workspaceId}`);
    }
    // La grande liste « Qui de nous deux ? » est réinstallée avec le reste du contenu par défaut.
    await tx.exec(sql`DELETE FROM app_settings WHERE key = ${whoLibraryKey(workspaceId)}`);
    await seedWorkspaceDefaults(tx, workspaceId, userId);
  });
  flushFileDeletions();
}
