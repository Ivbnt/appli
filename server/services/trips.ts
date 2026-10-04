import "server-only";
import { fromLocalInput } from "@/lib/dates";
import type { EventType, ReservationType } from "@/lib/domain";
import type { ReservationInput, TripInput } from "@/lib/validation/trips";
import { db, sql, type Tx } from "../db";
import { NotFoundError, UserError } from "../errors";
import { fileUrl, flushFileDeletions, queueFileDeletion, storage, storageKeys } from "../storage";
import { syncLinkedEvent } from "./calendar";

// ── Voyages ──────────────────────────────────────────────────

export type TripSummary = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  coverUrl: string | null;
  reservationCount: number;
  photoCount: number;
};

type TripRow = Omit<TripSummary, "coverUrl"> & { coverKey: string | null };

const TRIP_SELECT = sql`
  SELECT t.id, t.title, t.destination, t.start_date, t.end_date, t.description, t.latitude, t.longitude, t.cover_key,
         (SELECT count(*) FROM reservations r WHERE r.trip_id = t.id)::int AS reservation_count,
         (SELECT count(*) FROM photos p WHERE p.trip_id = t.id)::int AS photo_count
  FROM trips t`;

async function toSummary({ coverKey, ...row }: TripRow): Promise<TripSummary> {
  return { ...row, coverUrl: await fileUrl(coverKey) };
}

export async function listTrips(workspaceId: string) {
  const rows = await db.many<TripRow>(sql`${TRIP_SELECT} WHERE t.workspace_id = ${workspaceId} ORDER BY t.start_date DESC`);
  return Promise.all(rows.map(toSummary));
}

export async function getTrip(workspaceId: string, tripId: string) {
  const row = await db.maybe<TripRow>(sql`${TRIP_SELECT} WHERE t.workspace_id = ${workspaceId} AND t.id = ${tripId}`);
  return row ? toSummary(row) : null;
}

/** Un voyage apparaît dans le calendrier (journée entière), avec un rappel 3 jours avant le départ. */
async function syncTripEvent(tx: Tx, workspaceId: string, userId: string, tripId: string, input: TripInput) {
  await syncLinkedEvent(tx, workspaceId, { tripId }, {
    enabled: true,
    title: input.title,
    description: input.description,
    start: fromLocalInput(input.startDate),
    end: fromLocalInput(input.endDate),
    allDay: true,
    location: input.destination,
    type: "trip",
    reminderMinutes: 3 * 24 * 60,
    createdById: userId,
  });
}

export async function createTrip(workspaceId: string, userId: string, input: TripInput) {
  return db.tx(async (tx) => {
    const trip = await tx.one<{ id: string }>(sql`
      INSERT INTO trips (workspace_id, title, destination, start_date, end_date, description, latitude, longitude, created_by_id)
      VALUES (${workspaceId}, ${input.title}, ${input.destination}, ${input.startDate}, ${input.endDate}, ${input.description},
              ${input.latitude}, ${input.longitude}, ${userId})
      RETURNING id`);
    await syncTripEvent(tx, workspaceId, userId, trip.id, input);
    return trip;
  });
}

export async function updateTrip(workspaceId: string, userId: string, tripId: string, input: TripInput) {
  await db.tx(async (tx) => {
    const count = await tx.exec(sql`
      UPDATE trips SET title = ${input.title}, destination = ${input.destination}, start_date = ${input.startDate},
        end_date = ${input.endDate}, description = ${input.description}, latitude = ${input.latitude}, longitude = ${input.longitude}
      WHERE id = ${tripId} AND workspace_id = ${workspaceId}`);
    if (!count) throw new NotFoundError("Voyage");
    await syncTripEvent(tx, workspaceId, userId, tripId, input);
  });
}

/** Les réservations et photos du voyage sont conservées (détachées). */
export async function deleteTrip(workspaceId: string, tripId: string) {
  await db.tx(async (tx) => {
    const trip = await tx.maybe<{ coverKey: string | null }>(sql`
      DELETE FROM trips WHERE id = ${tripId} AND workspace_id = ${workspaceId} RETURNING cover_key`);
    if (!trip) throw new NotFoundError("Voyage");
    await queueFileDeletion([trip.coverKey], tx);
  });
  flushFileDeletions();
}

export async function setTripCover(workspaceId: string, tripId: string, image: Buffer) {
  const trip = await db.maybe<{ coverKey: string | null }>(sql`SELECT cover_key FROM trips WHERE id = ${tripId} AND workspace_id = ${workspaceId}`);
  if (!trip) throw new NotFoundError("Voyage");
  const key = storageKeys.tripCover(workspaceId, tripId);
  await storage().put(key, image, "image/webp");
  await db.exec(sql`UPDATE trips SET cover_key = ${key} WHERE id = ${tripId} AND workspace_id = ${workspaceId}`);
  await queueFileDeletion([trip.coverKey]);
  flushFileDeletions();
  return fileUrl(key);
}

// ── Réservations ─────────────────────────────────────────────

export type Reservation = {
  id: string;
  tripId: string | null;
  tripTitle: string | null;
  title: string;
  type: ReservationType;
  startsAt: Date;
  endsAt: Date | null;
  hasTime: boolean;
  location: string | null;
  origin: string | null;
  destination: string | null;
  provider: string | null;
  confirmationNumber: string | null;
  price: string | null;
  currency: string;
  documentName: string | null;
  documentMime: string | null;
  documentSize: number | null;
  hasDocument: boolean;
  url: string | null;
  notes: string | null;
  addToCalendar: boolean;
};

const RESERVATION_SELECT = sql`
  SELECT r.id, r.trip_id, t.title AS trip_title, r.title, r.type, r.starts_at, r.ends_at, r.has_time, r.location, r.origin,
         r.destination, r.provider, r.confirmation_number, r.price::text AS price, r.currency, r.document_name, r.document_mime,
         r.document_size, (r.document_key IS NOT NULL) AS has_document, r.url, r.notes, r.add_to_calendar
  FROM reservations r LEFT JOIN trips t ON t.id = r.trip_id`;

export function listReservations(workspaceId: string, filter: { tripId?: string } = {}) {
  return db.many<Reservation>(sql`${RESERVATION_SELECT}
    WHERE ${sql.and([sql`r.workspace_id = ${workspaceId}`, filter.tripId && sql`r.trip_id = ${filter.tripId}`])}
    ORDER BY r.starts_at ASC`);
}

export function getReservation(workspaceId: string, reservationId: string) {
  return db.maybe<Reservation>(sql`${RESERVATION_SELECT} WHERE r.workspace_id = ${workspaceId} AND r.id = ${reservationId}`);
}

const EVENT_TYPE_FOR: Record<ReservationType, EventType> = {
  flight: "reservation",
  train: "reservation",
  hotel: "reservation",
  rental: "reservation",
  restaurant: "restaurant",
  concert: "concert",
  activity: "activity",
  other: "reservation",
};

function reservationTimes(input: ReservationInput) {
  const start = fromLocalInput(input.date, input.time ?? "00:00");
  const end = input.endDate || input.endTime ? fromLocalInput(input.endDate ?? input.date, input.endTime ?? (input.time ? "23:59" : "00:00")) : null;
  return { start, end: end && end >= start ? end : null };
}

async function syncReservationEvent(tx: Tx, workspaceId: string, userId: string, reservationId: string, input: ReservationInput) {
  const { start, end } = reservationTimes(input);
  const reminder = await tx.maybe<{ defaultReminderMinutes: number | null }>(sql`
    SELECT default_reminder_minutes FROM users WHERE id = ${userId}`);
  const route = input.origin && input.destination ? `${input.origin} → ${input.destination}` : null;
  await syncLinkedEvent(tx, workspaceId, { reservationId }, {
    enabled: input.addToCalendar,
    title: input.title,
    description: [route, input.provider, input.confirmationNumber ? `Réf. ${input.confirmationNumber}` : null].filter(Boolean).join(" · ") || null,
    start,
    end,
    allDay: !input.time,
    location: input.location ?? input.origin,
    type: EVENT_TYPE_FOR[input.type],
    reminderMinutes: reminder?.defaultReminderMinutes ?? 1440,
    createdById: userId,
  });
}

function foreignKeyError(error: unknown) {
  if ((error as { code?: string }).code === "23503") return new UserError("Voyage introuvable.", { tripId: ["Voyage introuvable."] });
  return error;
}

export async function createReservation(workspaceId: string, userId: string, input: ReservationInput) {
  const { start, end } = reservationTimes(input);
  try {
    return await db.tx(async (tx) => {
      const row = await tx.one<{ id: string }>(sql`
        INSERT INTO reservations (workspace_id, trip_id, title, type, starts_at, ends_at, has_time, location, origin, destination,
                                  provider, confirmation_number, price, currency, url, notes, add_to_calendar, created_by_id)
        VALUES (${workspaceId}, ${input.tripId}, ${input.title}, ${input.type}, ${start}, ${end}, ${Boolean(input.time)},
                ${input.location}, ${input.origin}, ${input.destination}, ${input.provider}, ${input.confirmationNumber},
                ${input.price}, ${input.currency}, ${input.url}, ${input.notes}, ${input.addToCalendar}, ${userId})
        RETURNING id`);
      await syncReservationEvent(tx, workspaceId, userId, row.id, input);
      return row;
    });
  } catch (error) {
    throw foreignKeyError(error);
  }
}

export async function updateReservation(workspaceId: string, userId: string, reservationId: string, input: ReservationInput) {
  const { start, end } = reservationTimes(input);
  try {
    await db.tx(async (tx) => {
      const count = await tx.exec(sql`
        UPDATE reservations SET trip_id = ${input.tripId}, title = ${input.title}, type = ${input.type}, starts_at = ${start},
          ends_at = ${end}, has_time = ${Boolean(input.time)}, location = ${input.location}, origin = ${input.origin},
          destination = ${input.destination}, provider = ${input.provider}, confirmation_number = ${input.confirmationNumber},
          price = ${input.price}, currency = ${input.currency}, url = ${input.url}, notes = ${input.notes},
          add_to_calendar = ${input.addToCalendar}
        WHERE id = ${reservationId} AND workspace_id = ${workspaceId}`);
      if (!count) throw new NotFoundError("Réservation");
      await syncReservationEvent(tx, workspaceId, userId, reservationId, input);
    });
  } catch (error) {
    throw foreignKeyError(error);
  }
}

export async function deleteReservation(workspaceId: string, reservationId: string) {
  await db.tx(async (tx) => {
    const row = await tx.maybe<{ documentKey: string | null }>(sql`
      DELETE FROM reservations WHERE id = ${reservationId} AND workspace_id = ${workspaceId} RETURNING document_key`);
    if (!row) throw new NotFoundError("Réservation");
    await queueFileDeletion([row.documentKey], tx);
  });
  flushFileDeletions();
}

export async function setReservationDocument(
  workspaceId: string,
  reservationId: string,
  file: { buffer: Buffer; name: string; mime: string; ext: string },
) {
  const existing = await db.maybe<{ documentKey: string | null }>(sql`
    SELECT document_key FROM reservations WHERE id = ${reservationId} AND workspace_id = ${workspaceId}`);
  if (!existing) throw new NotFoundError("Réservation");
  const key = storageKeys.reservationDocument(workspaceId, reservationId, file.ext);
  await storage().put(key, file.buffer, file.mime);
  await db.exec(sql`
    UPDATE reservations SET document_key = ${key}, document_name = ${file.name.slice(0, 200)}, document_mime = ${file.mime},
      document_size = ${file.buffer.length}
    WHERE id = ${reservationId} AND workspace_id = ${workspaceId}`);
  await queueFileDeletion([existing.documentKey]);
  flushFileDeletions();
}

export async function removeReservationDocument(workspaceId: string, reservationId: string) {
  const row = await db.maybe<{ documentKey: string | null }>(sql`
    UPDATE reservations r SET document_key = NULL, document_name = NULL, document_mime = NULL, document_size = NULL
    FROM (SELECT document_key FROM reservations WHERE id = ${reservationId} AND workspace_id = ${workspaceId}) old
    WHERE r.id = ${reservationId} AND r.workspace_id = ${workspaceId}
    RETURNING old.document_key`);
  if (!row) throw new NotFoundError("Réservation");
  await queueFileDeletion([row.documentKey]);
  flushFileDeletions();
}

export async function reservationDocumentUrl(workspaceId: string, reservationId: string, inline: boolean) {
  const row = await db.maybe<{ documentKey: string | null; documentName: string | null }>(sql`
    SELECT document_key, document_name FROM reservations WHERE id = ${reservationId} AND workspace_id = ${workspaceId}`);
  if (!row?.documentKey) return null;
  return storage().signedUrl(row.documentKey, inline ? undefined : { downloadName: row.documentName ?? "document" });
}
