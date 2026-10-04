import "server-only";
import { randomUUID } from "node:crypto";
import { db, sql } from "../db";
import { NotFoundError, UserError } from "../errors";
import { processImage } from "../media/images";
import { fileUrl, flushFileDeletions, queueFileDeletion, storage, storageKeys } from "../storage";

type PhotoRow = {
  id: string;
  albumId: string | null;
  storageKey: string;
  thumbnailKey: string;
  previewKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  description: string | null;
  takenAt: Date | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  tripId: string | null;
  createdById: string | null;
  createdAt: Date;
};

/** Photo telle qu'envoyée au navigateur : jamais de clé de stockage, uniquement des URLs signées. */
export type PhotoView = {
  id: string;
  thumbUrl: string;
  previewUrl: string;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  description: string | null;
  takenAt: Date | null;
  location: string | null;
  albumId: string | null;
  placeId: string | null;
  tripId: string | null;
  originalName: string;
  sizeBytes: number;
  createdById: string | null;
  createdAt: Date;
};

const COLUMNS = sql`id, album_id, storage_key, thumbnail_key, preview_key, original_name, mime_type, size_bytes, width, height,
  dominant_color, description, taken_at, location, latitude, longitude, place_id, trip_id, created_by_id, created_at`;

export async function toPhotoView(row: PhotoRow): Promise<PhotoView> {
  const [thumbUrl, previewUrl] = await Promise.all([fileUrl(row.thumbnailKey), fileUrl(row.previewKey)]);
  return {
    id: row.id,
    thumbUrl: thumbUrl!,
    previewUrl: previewUrl!,
    width: row.width,
    height: row.height,
    dominantColor: row.dominantColor,
    description: row.description,
    takenAt: row.takenAt,
    location: row.location,
    albumId: row.albumId,
    placeId: row.placeId,
    tripId: row.tripId,
    originalName: row.originalName,
    sizeBytes: row.sizeBytes,
    createdById: row.createdById,
    createdAt: row.createdAt,
  };
}

export type PhotoFilter = { albumId?: string | null; placeId?: string | null; tripId?: string | null };

function encodeCursor(row: PhotoRow) {
  return Buffer.from(`${(row.takenAt ?? row.createdAt).toISOString()}|${row.id}`).toString("base64url");
}

function decodeCursor(cursor: string | null | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  const [at, id] = Buffer.from(cursor, "base64url").toString().split("|");
  const date = new Date(at ?? "");
  if (!id || Number.isNaN(date.getTime()) || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return { at: date, id };
}

/** Pagination par curseur (date de prise de vue décroissante) : stable et rapide, même avec beaucoup de photos. */
export async function listPhotos(workspaceId: string, filter: PhotoFilter = {}, options: { cursor?: string | null; limit?: number } = {}) {
  const limit = Math.min(options.limit ?? 120, 200);
  const cursor = decodeCursor(options.cursor);
  const rows = await db.many<PhotoRow>(sql`
    SELECT ${COLUMNS} FROM photos
    WHERE ${sql.and([
      sql`workspace_id = ${workspaceId}`,
      filter.albumId && sql`album_id = ${filter.albumId}`,
      filter.placeId && sql`place_id = ${filter.placeId}`,
      filter.tripId && sql`trip_id = ${filter.tripId}`,
      cursor && sql`(COALESCE(taken_at, created_at), id) < (${cursor.at}, ${cursor.id}::uuid)`,
    ])}
    ORDER BY COALESCE(taken_at, created_at) DESC, id DESC
    LIMIT ${limit + 1}`);
  const page = rows.slice(0, limit);
  return {
    photos: await Promise.all(page.map(toPhotoView)),
    nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]!) : null,
  };
}

export async function countPhotos(workspaceId: string, filter: PhotoFilter = {}) {
  return db.count(sql`
    SELECT count(*) FROM photos WHERE ${sql.and([
      sql`workspace_id = ${workspaceId}`,
      filter.albumId && sql`album_id = ${filter.albumId}`,
      filter.placeId && sql`place_id = ${filter.placeId}`,
      filter.tripId && sql`trip_id = ${filter.tripId}`,
    ])}`);
}

export async function getPhotoRow(workspaceId: string, photoId: string) {
  return db.maybe<PhotoRow>(sql`SELECT ${COLUMNS} FROM photos WHERE id = ${photoId} AND workspace_id = ${workspaceId}`);
}

export async function uploadPhoto(
  workspaceId: string,
  userId: string,
  file: { buffer: Buffer; name: string },
  links: PhotoFilter,
): Promise<PhotoView> {
  const image = await processImage(file.buffer);
  const id = randomUUID();
  const keys = {
    original: storageKeys.photo(workspaceId, id, "original", image.original.ext),
    thumb: storageKeys.photo(workspaceId, id, "thumb", "webp"),
    preview: storageKeys.photo(workspaceId, id, "preview", "webp"),
  };

  await Promise.all([
    storage().put(keys.original, image.original.buffer, image.original.mime),
    storage().put(keys.thumb, image.thumb, "image/webp"),
    storage().put(keys.preview, image.preview, "image/webp"),
  ]);

  try {
    const row = await db.one<PhotoRow>(sql`
      INSERT INTO photos (id, workspace_id, album_id, storage_key, thumbnail_key, preview_key, original_name, mime_type, size_bytes,
                          width, height, dominant_color, taken_at, latitude, longitude, place_id, trip_id, created_by_id)
      VALUES (${id}, ${workspaceId}, ${links.albumId ?? null}, ${keys.original}, ${keys.thumb}, ${keys.preview},
              ${file.name.slice(0, 200)}, ${image.original.mime}, ${file.buffer.length}, ${image.width}, ${image.height},
              ${image.dominantColor}, ${image.takenAt}, ${image.latitude}, ${image.longitude}, ${links.placeId ?? null},
              ${links.tripId ?? null}, ${userId})
      RETURNING ${COLUMNS}`);
    return toPhotoView(row);
  } catch (error) {
    // L'insertion a échoué (album d'un autre espace, base indisponible…) : on ne laisse aucun fichier orphelin.
    await queueFileDeletion(Object.values(keys));
    flushFileDeletions();
    if ((error as { code?: string }).code === "23503") throw new UserError("Album, lieu ou voyage introuvable.");
    throw error;
  }
}

export async function updatePhoto(
  workspaceId: string,
  photoId: string,
  input: { description: string | null; location: string | null; takenAt: string | null },
) {
  const row = await db.maybe<PhotoRow>(sql`
    UPDATE photos SET description = ${input.description}, location = ${input.location}, taken_at = ${input.takenAt}
    WHERE id = ${photoId} AND workspace_id = ${workspaceId}
    RETURNING ${COLUMNS}`);
  if (!row) throw new NotFoundError("Photo");
  return toPhotoView(row);
}

export async function deletePhotos(workspaceId: string, ids: string[]): Promise<number> {
  const count = await db.tx(async (tx) => {
    const rows = await tx.many<{ storageKey: string; thumbnailKey: string; previewKey: string }>(sql`
      DELETE FROM photos WHERE workspace_id = ${workspaceId} AND id = ANY(${ids}::uuid[])
      RETURNING storage_key, thumbnail_key, preview_key`);
    await queueFileDeletion(rows.flatMap((r) => [r.storageKey, r.thumbnailKey, r.previewKey]), tx);
    return rows.length;
  });
  flushFileDeletions();
  return count;
}

export async function movePhotosToAlbum(workspaceId: string, ids: string[], albumId: string | null) {
  try {
    return await db.exec(sql`
      UPDATE photos SET album_id = ${albumId} WHERE workspace_id = ${workspaceId} AND id = ANY(${ids}::uuid[])`);
  } catch (error) {
    if ((error as { code?: string }).code === "23503") throw new NotFoundError("Album");
    throw error;
  }
}

/** URL de téléchargement de l'original, avec son nom de fichier d'origine. */
export async function originalDownloadUrl(workspaceId: string, photoId: string) {
  const row = await getPhotoRow(workspaceId, photoId);
  if (!row) return null;
  return storage().signedUrl(row.storageKey, { downloadName: row.originalName });
}

// ── Albums ───────────────────────────────────────────────────

export type AlbumView = {
  id: string;
  title: string;
  description: string | null;
  photoCount: number;
  coverUrl: string | null;
  coverColor: string | null;
  firstAt: Date | null;
  lastAt: Date | null;
  createdAt: Date;
};

type AlbumRow = Omit<AlbumView, "coverUrl"> & { coverKey: string | null };

const ALBUM_SELECT = sql`
  SELECT a.id, a.title, a.description, a.created_at,
         (SELECT count(*) FROM photos p WHERE p.album_id = a.id)::int AS photo_count,
         (SELECT min(COALESCE(p.taken_at, p.created_at)) FROM photos p WHERE p.album_id = a.id) AS first_at,
         (SELECT max(COALESCE(p.taken_at, p.created_at)) FROM photos p WHERE p.album_id = a.id) AS last_at,
         cover.preview_key AS cover_key, cover.dominant_color AS cover_color
  FROM albums a
  LEFT JOIN LATERAL (
    SELECT preview_key, dominant_color FROM photos p
    WHERE p.id = a.cover_photo_id OR (a.cover_photo_id IS NULL AND p.album_id = a.id)
    ORDER BY (p.id = a.cover_photo_id) DESC, COALESCE(p.taken_at, p.created_at) DESC
    LIMIT 1
  ) cover ON TRUE`;

async function toAlbumView(row: AlbumRow): Promise<AlbumView> {
  const { coverKey, ...rest } = row;
  return { ...rest, coverUrl: await fileUrl(coverKey) };
}

export async function listAlbums(workspaceId: string) {
  const rows = await db.many<AlbumRow>(sql`${ALBUM_SELECT} WHERE a.workspace_id = ${workspaceId} ORDER BY a.created_at DESC`);
  return Promise.all(rows.map(toAlbumView));
}

export async function getAlbum(workspaceId: string, albumId: string) {
  const row = await db.maybe<AlbumRow>(sql`${ALBUM_SELECT} WHERE a.workspace_id = ${workspaceId} AND a.id = ${albumId}`);
  return row ? toAlbumView(row) : null;
}

export async function createAlbum(workspaceId: string, userId: string, input: { title: string; description: string | null }) {
  return db.one<{ id: string }>(sql`
    INSERT INTO albums (workspace_id, title, description, created_by_id)
    VALUES (${workspaceId}, ${input.title}, ${input.description}, ${userId}) RETURNING id`);
}

export async function updateAlbum(workspaceId: string, albumId: string, input: { title: string; description: string | null }) {
  const count = await db.exec(sql`
    UPDATE albums SET title = ${input.title}, description = ${input.description} WHERE id = ${albumId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Album");
}

/** Supprime l'album ; ses photos restent dans la photothèque. */
export async function deleteAlbum(workspaceId: string, albumId: string) {
  const count = await db.exec(sql`DELETE FROM albums WHERE id = ${albumId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Album");
}

export async function setAlbumCover(workspaceId: string, albumId: string, photoId: string) {
  try {
    const count = await db.exec(sql`
      UPDATE albums SET cover_photo_id = ${photoId} WHERE id = ${albumId} AND workspace_id = ${workspaceId}`);
    if (!count) throw new NotFoundError("Album");
  } catch (error) {
    if ((error as { code?: string }).code === "23503") throw new NotFoundError("Photo");
    throw error;
  }
}

// ── Timeline ─────────────────────────────────────────────────

export type MilestoneView = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  photoId: string | null;
  photoUrl: string | null;
  photoColor: string | null;
};

export async function listMilestones(workspaceId: string): Promise<MilestoneView[]> {
  const rows = await db.many<Omit<MilestoneView, "photoUrl"> & { previewKey: string | null }>(sql`
    SELECT m.id, m.title, m.description, m.date, m.photo_id, p.preview_key, p.dominant_color AS photo_color
    FROM milestones m LEFT JOIN photos p ON p.id = m.photo_id
    WHERE m.workspace_id = ${workspaceId}
    ORDER BY m.date DESC, m.created_at DESC`);
  return Promise.all(rows.map(async ({ previewKey, ...row }) => ({ ...row, photoUrl: await fileUrl(previewKey) })));
}

export async function saveMilestone(
  workspaceId: string,
  userId: string,
  input: { id?: string; title: string; description: string | null; date: string; photoId: string | null },
) {
  try {
    if (input.id) {
      const count = await db.exec(sql`
        UPDATE milestones SET title = ${input.title}, description = ${input.description}, date = ${input.date}, photo_id = ${input.photoId}
        WHERE id = ${input.id} AND workspace_id = ${workspaceId}`);
      if (!count) throw new NotFoundError("Moment");
      return;
    }
    await db.exec(sql`
      INSERT INTO milestones (workspace_id, title, description, date, photo_id, created_by_id)
      VALUES (${workspaceId}, ${input.title}, ${input.description}, ${input.date}, ${input.photoId}, ${userId})`);
  } catch (error) {
    if ((error as { code?: string }).code === "23503") throw new NotFoundError("Photo");
    throw error;
  }
}

export async function deleteMilestone(workspaceId: string, milestoneId: string) {
  const count = await db.exec(sql`DELETE FROM milestones WHERE id = ${milestoneId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Moment");
}
