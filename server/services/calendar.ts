import "server-only";
import { addDays, fromLocalInput, toLocalInput } from "@/lib/dates";
import type { EventType, Recurrence } from "@/lib/domain";
import type { EventInput } from "@/lib/validation/events";
import { db, sql, type Tx } from "../db";
import { NotFoundError } from "../errors";

export type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  allDay: boolean;
  location: string | null;
  type: EventType;
  recurrence: Recurrence;
  reminderMinutes: number | null;
  createdById: string | null;
  reservationId: string | null;
  tripId: string | null;
};

/** Une occurrence affichable (les événements annuels sont dépliés année par année). */
export type EventOccurrence = CalendarEventRow & { occurrenceStart: Date; occurrenceEnd: Date | null; key: string };

const EVENT_COLUMNS = sql`id, title, description, start_date, end_date, all_day, location, type, recurrence,
  reminder_minutes, created_by_id, reservation_id, trip_id`;

/** Date de l'occurrence d'un événement annuel pour une année donnée (29 février → 28 hors bissextile). */
export function occurrenceInYear(event: Pick<CalendarEventRow, "startDate" | "endDate">, year: number) {
  const { date, time } = toLocalInput(event.startDate);
  let monthDay = date.slice(5);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (monthDay === "02-29" && !leap) monthDay = "02-28";
  const start = fromLocalInput(`${year}-${monthDay}`, time);
  const end = event.endDate ? new Date(start.getTime() + (event.endDate.getTime() - event.startDate.getTime())) : null;
  return { start, end };
}

/** Prochaine occurrence d'un événement à partir d'un instant. */
export function nextOccurrence(event: Pick<CalendarEventRow, "startDate" | "endDate" | "recurrence">, from = new Date()) {
  if (event.recurrence === "none") return event.startDate >= from ? event.startDate : null;
  const startYear = Math.max(Number(toLocalInput(from).date.slice(0, 4)), Number(toLocalInput(event.startDate).date.slice(0, 4)));
  for (let year = startYear; year <= startYear + 1; year++) {
    const { start } = occurrenceInYear(event, year);
    if (start >= from && start >= event.startDate) return start;
  }
  return null;
}

/** Événements chevauchant [from, to), avec les occurrences annuelles. */
export async function listOccurrences(workspaceId: string, from: Date, to: Date): Promise<EventOccurrence[]> {
  const rows = await db.many<CalendarEventRow>(sql`
    SELECT ${EVENT_COLUMNS} FROM calendar_events
    WHERE workspace_id = ${workspaceId}
      AND (
        (recurrence = 'none' AND start_date < ${to} AND COALESCE(end_date, start_date) >= ${from})
        OR (recurrence = 'yearly' AND start_date < ${to})
      )
    ORDER BY start_date`);

  const occurrences: EventOccurrence[] = [];
  const fromYear = Number(toLocalInput(from).date.slice(0, 4));
  const toYear = Number(toLocalInput(to).date.slice(0, 4));
  for (const event of rows) {
    if (event.recurrence === "none") {
      occurrences.push({ ...event, occurrenceStart: event.startDate, occurrenceEnd: event.endDate, key: event.id });
      continue;
    }
    for (let year = fromYear; year <= toYear; year++) {
      const { start, end } = occurrenceInYear(event, year);
      if (start < event.startDate) continue;
      if (start < to && (end ?? start) >= from) {
        occurrences.push({ ...event, occurrenceStart: start, occurrenceEnd: end, key: `${event.id}:${year}` });
      }
    }
  }
  return occurrences.sort((a, b) => a.occurrenceStart.getTime() - b.occurrenceStart.getTime());
}

export async function getEvent(workspaceId: string, eventId: string) {
  return db.maybe<CalendarEventRow>(sql`
    SELECT ${EVENT_COLUMNS} FROM calendar_events WHERE id = ${eventId} AND workspace_id = ${workspaceId}`);
}

/** Convertit la saisie (jour + heure dans le fuseau de l'application) en instants UTC. */
export function eventTimes(input: Pick<EventInput, "allDay" | "startDay" | "startTime" | "endDay" | "endTime">) {
  const start = fromLocalInput(input.startDay, input.allDay ? "00:00" : input.startTime ?? "00:00");
  let end: Date | null = null;
  if (input.endDay || input.endTime) {
    const endDay = input.endDay ?? input.startDay;
    end = input.allDay ? fromLocalInput(endDay, "00:00") : fromLocalInput(endDay, input.endTime ?? "23:59");
  }
  if (end && end < start) end = null;
  return { start, end };
}

/**
 * (Re)planifie le rappel de la prochaine occurrence. Appelé à chaque modification
 * d'événement et par le worker après chaque envoi (pour les événements annuels).
 */
export async function scheduleReminder(tx: Tx, event: Pick<CalendarEventRow, "id" | "startDate" | "endDate" | "recurrence" | "reminderMinutes">, workspaceId: string) {
  await tx.exec(sql`DELETE FROM reminders WHERE event_id = ${event.id} AND status = 'pending'`);
  if (event.reminderMinutes === null) return;
  const now = new Date();
  let occurrence = nextOccurrence(event, now);
  // Si le moment du rappel est déjà passé pour la prochaine occurrence annuelle, on vise la suivante.
  if (occurrence && event.recurrence === "yearly" && occurrence.getTime() - event.reminderMinutes * 60_000 < now.getTime()) {
    occurrence = nextOccurrence(event, new Date(occurrence.getTime() + 1000));
  }
  if (!occurrence) return;
  const remindAt = new Date(occurrence.getTime() - event.reminderMinutes * 60_000);
  if (remindAt < now) return;
  await tx.exec(sql`
    INSERT INTO reminders (workspace_id, event_id, occurrence_at, remind_at)
    VALUES (${workspaceId}, ${event.id}, ${occurrence}, ${remindAt})
    ON CONFLICT (event_id, occurrence_at) DO UPDATE SET remind_at = EXCLUDED.remind_at, status = 'pending', attempts = 0, last_error = NULL`);
}

export async function createEvent(workspaceId: string, userId: string, input: EventInput) {
  const { start, end } = eventTimes(input);
  return db.tx(async (tx) => {
    const event = await tx.one<CalendarEventRow>(sql`
      INSERT INTO calendar_events (workspace_id, title, description, start_date, end_date, all_day, location, type, recurrence,
                                   reminder_minutes, created_by_id)
      VALUES (${workspaceId}, ${input.title}, ${input.description}, ${start}, ${end}, ${input.allDay}, ${input.location},
              ${input.type}, ${input.recurrence}, ${input.reminderMinutes}, ${userId})
      RETURNING ${EVENT_COLUMNS}`);
    await scheduleReminder(tx, event, workspaceId);
    return event;
  });
}

export async function updateEvent(workspaceId: string, eventId: string, input: EventInput) {
  const { start, end } = eventTimes(input);
  return db.tx(async (tx) => {
    const event = await tx.maybe<CalendarEventRow>(sql`
      UPDATE calendar_events SET
        title = ${input.title}, description = ${input.description}, start_date = ${start}, end_date = ${end},
        all_day = ${input.allDay}, location = ${input.location}, type = ${input.type}, recurrence = ${input.recurrence},
        reminder_minutes = ${input.reminderMinutes}
      WHERE id = ${eventId} AND workspace_id = ${workspaceId}
        AND reservation_id IS NULL AND trip_id IS NULL
      RETURNING ${EVENT_COLUMNS}`);
    if (!event) throw new NotFoundError("Événement");
    await scheduleReminder(tx, event, workspaceId);
    return event;
  });
}

export async function deleteEvent(workspaceId: string, eventId: string) {
  const count = await db.exec(sql`
    DELETE FROM calendar_events WHERE id = ${eventId} AND workspace_id = ${workspaceId} AND reservation_id IS NULL AND trip_id IS NULL`);
  if (!count) throw new NotFoundError("Événement");
}

/** Événement lié à une réservation ou un voyage : créé, mis à jour ou supprimé automatiquement. */
export async function syncLinkedEvent(
  tx: Tx,
  workspaceId: string,
  link: { reservationId: string } | { tripId: string },
  data: {
    enabled: boolean;
    title: string;
    description: string | null;
    start: Date;
    end: Date | null;
    allDay: boolean;
    location: string | null;
    type: EventType;
    reminderMinutes: number | null;
    createdById: string | null;
  } | null,
) {
  const column = "reservationId" in link ? sql.raw("reservation_id") : sql.raw("trip_id");
  const linkId = "reservationId" in link ? link.reservationId : link.tripId;
  if (!data || !data.enabled) {
    await tx.exec(sql`DELETE FROM calendar_events WHERE workspace_id = ${workspaceId} AND ${column} = ${linkId}`);
    return;
  }
  const event = await tx.one<CalendarEventRow>(sql`
    INSERT INTO calendar_events (workspace_id, title, description, start_date, end_date, all_day, location, type,
                                 reminder_minutes, created_by_id, ${column})
    VALUES (${workspaceId}, ${data.title}, ${data.description}, ${data.start}, ${data.end}, ${data.allDay}, ${data.location},
            ${data.type}, ${data.reminderMinutes}, ${data.createdById}, ${linkId})
    ON CONFLICT (${column}) DO UPDATE SET
      title = EXCLUDED.title, description = EXCLUDED.description, start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date, all_day = EXCLUDED.all_day, location = EXCLUDED.location, type = EXCLUDED.type,
      reminder_minutes = EXCLUDED.reminder_minutes
    RETURNING ${EVENT_COLUMNS}`);
  await scheduleReminder(tx, event, workspaceId);
}

/** Plage [from, to) affichée pour une vue et une date d'ancrage (AAAA-MM-JJ). */
export function rangeFor(view: "month" | "week" | "agenda", anchor: string) {
  if (view === "week") {
    const start = addDays(anchor, -((new Date(`${anchor}T00:00:00Z`).getUTCDay() + 6) % 7));
    return { startDay: start, endDay: addDays(start, 7) };
  }
  if (view === "agenda") return { startDay: anchor, endDay: addDays(anchor, 60) };
  const first = `${anchor.slice(0, 7)}-01`;
  const gridStart = addDays(first, -((new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7));
  return { startDay: gridStart, endDay: addDays(gridStart, 42) };
}
