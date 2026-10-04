import "server-only";
import type { PlaceCategory, PlaceStatus } from "@/lib/domain";
import type { PlaceInput } from "@/lib/validation/places";
import { db, sql } from "../db";
import { NotFoundError, UserError } from "../errors";

export type PlaceRow = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  status: PlaceStatus;
  visitedAt: string | null;
  rating: number | null;
  notes: string | null;
  externalUrl: string | null;
  tripId: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  photoCount: number;
};

const COLUMNS = sql`l.id, l.name, l.address, l.latitude, l.longitude, l.category, l.status, l.visited_at, l.rating, l.notes,
  l.external_url, l.trip_id, l.created_by_id, l.created_at, l.updated_at,
  (SELECT count(*) FROM photos p WHERE p.place_id = l.id)::int AS photo_count`;

export function listPlaces(workspaceId: string) {
  return db.many<PlaceRow>(sql`
    SELECT ${COLUMNS} FROM locations l WHERE l.workspace_id = ${workspaceId} ORDER BY l.updated_at DESC`);
}

export function getPlace(workspaceId: string, placeId: string) {
  return db.maybe<PlaceRow>(sql`SELECT ${COLUMNS} FROM locations l WHERE l.id = ${placeId} AND l.workspace_id = ${workspaceId}`);
}

function normalize(input: PlaceInput) {
  // Une date de visite n'a de sens que pour un lieu visité.
  return { ...input, visitedAt: input.status === "visited" ? input.visitedAt : null, rating: input.status === "visited" ? input.rating : null };
}

export async function createPlace(workspaceId: string, userId: string, raw: PlaceInput) {
  const input = normalize(raw);
  try {
    const row = await db.one<{ id: string }>(sql`
      INSERT INTO locations (workspace_id, name, address, latitude, longitude, category, status, visited_at, rating, notes,
                             external_url, trip_id, created_by_id)
      VALUES (${workspaceId}, ${input.name}, ${input.address}, ${input.latitude}, ${input.longitude}, ${input.category},
              ${input.status}, ${input.visitedAt}, ${input.rating}, ${input.notes}, ${input.externalUrl}, ${input.tripId}, ${userId})
      RETURNING id`);
    return (await getPlace(workspaceId, row.id))!;
  } catch (error) {
    throw tripReferenceError(error);
  }
}

export async function updatePlace(workspaceId: string, placeId: string, raw: PlaceInput) {
  const input = normalize(raw);
  try {
    const count = await db.exec(sql`
      UPDATE locations SET
        name = ${input.name}, address = ${input.address}, latitude = ${input.latitude}, longitude = ${input.longitude},
        category = ${input.category}, status = ${input.status}, visited_at = ${input.visitedAt}, rating = ${input.rating},
        notes = ${input.notes}, external_url = ${input.externalUrl}, trip_id = ${input.tripId}
      WHERE id = ${placeId} AND workspace_id = ${workspaceId}`);
    if (!count) throw new NotFoundError("Lieu");
  } catch (error) {
    throw tripReferenceError(error);
  }
  return (await getPlace(workspaceId, placeId))!;
}

export async function movePlace(workspaceId: string, placeId: string, latitude: number, longitude: number) {
  const count = await db.exec(sql`
    UPDATE locations SET latitude = ${latitude}, longitude = ${longitude} WHERE id = ${placeId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Lieu");
}

export async function deletePlace(workspaceId: string, placeId: string) {
  const count = await db.exec(sql`DELETE FROM locations WHERE id = ${placeId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Lieu");
}

/** La clé étrangère composite refuse un voyage d'un autre espace : message clair. */
function tripReferenceError(error: unknown) {
  if ((error as { code?: string }).code === "23503") return new UserError("Voyage introuvable.", { tripId: ["Voyage introuvable."] });
  return error;
}
