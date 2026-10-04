import "server-only";
import { daysUntil, formatDay, formatTime, toISODay } from "@/lib/dates";
import type { EventType } from "@/lib/domain";
import { ucfirst } from "@/lib/utils";
import { db, sql } from "../db";
import { sendEmail } from "../email";
import { reminderEmail } from "../email/templates";
import { scheduleReminder, type CalendarEventRow } from "./calendar";

const MAX_ATTEMPTS = 5;

/** « Demain », « Dans 7 jours », « Aujourd'hui »… */
export function whenLabel(occurrence: Date, now = new Date()): string {
  const diff = daysUntil(toISODay(occurrence), now);
  if (diff <= 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  return `Dans ${diff} jours`;
}

/** Résumé du rappel : « restaurant à 20h », « anniversaire », « départ pour Rome »… */
export function reminderSummary(event: { title: string; type: EventType; allDay: boolean; location: string | null }, occurrence: Date): string {
  const time = event.allDay ? "" : ` à ${formatTime(occurrence).replace(":00", "h").replace(":", "h")}`;
  switch (event.type) {
    case "trip":
      return `départ pour ${event.location || event.title}`;
    case "birthday":
      return `anniversaire — ${event.title}`;
    case "important_date":
      return event.title;
    case "restaurant":
      return `${event.title}${time}`;
    default:
      return `${event.title}${time}`;
  }
}

type DueReminder = {
  id: string;
  workspaceId: string;
  occurrenceAt: Date;
  attempts: number;
  event: CalendarEventRow;
};

/**
 * Envoie les rappels arrivés à échéance. Sûr en parallèle : chaque rappel est réservé
 * (FOR UPDATE SKIP LOCKED + verrou temporel) avant l'envoi.
 */
export async function processDueReminders(limit = 50): Promise<{ sent: number; failed: number }> {
  const due = await db.tx(async (tx) => {
    const rows = await tx.many<{ id: string; workspaceId: string; occurrenceAt: Date; attempts: number; eventId: string }>(sql`
      SELECT id, workspace_id, occurrence_at, attempts, event_id FROM reminders
      WHERE status = 'pending' AND remind_at <= now() AND (locked_until IS NULL OR locked_until < now())
      ORDER BY remind_at LIMIT ${limit}
      FOR UPDATE SKIP LOCKED`);
    if (rows.length) {
      await tx.exec(sql`UPDATE reminders SET locked_until = now() + interval '5 minutes' WHERE id = ANY(${rows.map((r) => r.id)}::uuid[])`);
    }
    return rows;
  });

  let sent = 0;
  let failed = 0;
  for (const row of due) {
    const event = await db.maybe<CalendarEventRow>(sql`
      SELECT id, title, description, start_date, end_date, all_day, location, type, recurrence, reminder_minutes,
             created_by_id, reservation_id, trip_id
      FROM calendar_events WHERE id = ${row.eventId}`);
    if (!event) {
      await db.exec(sql`UPDATE reminders SET status = 'cancelled' WHERE id = ${row.id}`);
      continue;
    }
    try {
      await deliver({ ...row, event });
      await db.tx(async (tx) => {
        await tx.exec(sql`UPDATE reminders SET status = 'sent', sent_at = now(), locked_until = NULL WHERE id = ${row.id}`);
        // Événement annuel : on programme le rappel de l'année suivante.
        if (event.recurrence === "yearly") await scheduleReminder(tx, event, row.workspaceId);
      });
      sent++;
    } catch (error) {
      failed++;
      const attempts = row.attempts + 1;
      await db.exec(sql`
        UPDATE reminders SET attempts = ${attempts}, last_error = ${String(error).slice(0, 500)}, locked_until = NULL,
          status = ${attempts >= MAX_ATTEMPTS ? "failed" : "pending"},
          remind_at = now() + make_interval(mins => ${Math.min(60, 2 ** attempts)})
        WHERE id = ${row.id}`);
    }
  }
  return { sent, failed };
}

async function deliver(reminder: DueReminder) {
  const recipients = await db.many<{ name: string; email: string }>(sql`
    SELECT u.name, u.email FROM workspace_members m JOIN users u ON u.id = m.user_id
    WHERE m.workspace_id = ${reminder.workspaceId} AND u.reminder_emails AND u.email_verified_at IS NOT NULL`);
  const when = whenLabel(reminder.occurrenceAt);
  const summary = reminderSummary(reminder.event, reminder.occurrenceAt);
  const title = summary.charAt(0).toUpperCase() + summary.slice(1);
  const details = [
    ucfirst(`${formatDay(toISODay(reminder.occurrenceAt), "full")}${reminder.event.allDay ? "" : ` à ${formatTime(reminder.occurrenceAt)}`}`),
    reminder.event.location ? `Lieu : ${reminder.event.location}` : null,
    reminder.event.description,
  ].filter((line): line is string => Boolean(line));
  for (const recipient of recipients) {
    await sendEmail(reminderEmail(recipient.email, recipient.name, title, when, details));
  }
}

/** Ménage périodique : sessions et jetons expirés, compteurs de rate limiting. */
export async function cleanupExpired() {
  const [sessions, tokens, limits] = await Promise.all([
    db.exec(sql`DELETE FROM sessions WHERE expires_at < now()`),
    db.exec(sql`DELETE FROM auth_tokens WHERE expires_at < now() - interval '7 days' OR used_at < now() - interval '7 days'`),
    db.exec(sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`),
  ]);
  return { sessions, tokens, limits };
}
