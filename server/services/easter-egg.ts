import "server-only";
import { ALMA_SINCE } from "@/lib/easter-egg";
import { db, sql } from "../db";
import { createEvent } from "./calendar";

/**
 * Première découverte du code secret : ajoute « Alma » à l'agenda (une seule fois par espace,
 * même si le code est retapé ou si l'événement est supprimé ensuite).
 */
export async function unlockAlma(workspaceId: string, userId: string): Promise<{ added: boolean }> {
  const key = `easter-egg:alma:${workspaceId}`;
  const claimed = await db.maybe(sql`
    INSERT INTO app_settings (key, value) VALUES (${key}, ${userId})
    ON CONFLICT (key) DO NOTHING
    RETURNING key`);
  if (!claimed) return { added: false };

  try {
    await createEvent(workspaceId, userId, {
      title: "Alma ✨",
      description: "Le compteur secret tourne depuis ce jour-là. Pour le revoir, tapez A, L, M, A.",
      type: "important_date",
      allDay: true,
      startDay: ALMA_SINCE,
      startTime: null,
      endDay: null,
      endTime: null,
      location: null,
      recurrence: "yearly",
      reminderMinutes: 1440,
    });
  } catch (error) {
    await db.exec(sql`DELETE FROM app_settings WHERE key = ${key}`);
    throw error;
  }
  return { added: true };
}
