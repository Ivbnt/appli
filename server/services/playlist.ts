import "server-only";
import { db, sql } from "../db";
import { integrations } from "../env";
import { UserError } from "../errors";
import { fetchPlaylistWithApi, fetchPlaylistWithOEmbed, getConnection, parsePlaylistId, type SpotifyTrack } from "../integrations/spotify";

export type Playlist = {
  id: string;
  spotifyId: string;
  url: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerName: string | null;
  trackCount: number | null;
  tracks: SpotifyTrack[] | null;
  lastSyncedAt: Date | null;
};

export function getPlaylist(workspaceId: string) {
  return db.maybe<Playlist>(sql`
    SELECT id, spotify_id, url, name, description, image_url, owner_name, track_count, tracks, last_synced_at
    FROM playlists WHERE workspace_id = ${workspaceId} ORDER BY updated_at DESC LIMIT 1`);
}

/** Récupère la playlist (API si connectée, sinon oEmbed) et enregistre l'instantané. */
export async function syncPlaylist(workspaceId: string, input: string) {
  const playlistId = parsePlaylistId(input);
  if (!playlistId) throw new UserError("Lien de playlist invalide. Copiez le lien depuis Spotify : Partager → Copier le lien.");

  let snapshot = null;
  if (integrations.spotify() && (await getConnection(workspaceId))) {
    try {
      snapshot = await fetchPlaylistWithApi(workspaceId, playlistId);
    } catch (error) {
      console.error("[spotify]", error);
      throw new UserError(error instanceof Error && error.message.startsWith("Playlist") ? error.message : "Spotify ne répond pas pour le moment. Réessayez dans un instant.");
    }
  }
  snapshot ??= await fetchPlaylistWithOEmbed(playlistId);

  // Une seule playlist commune par espace : la nouvelle remplace la précédente.
  await db.tx(async (tx) => {
    await tx.exec(sql`DELETE FROM playlists WHERE workspace_id = ${workspaceId} AND spotify_id <> ${snapshot.spotifyId}`);
    await tx.exec(sql`
      INSERT INTO playlists (workspace_id, spotify_id, url, name, description, image_url, owner_name, track_count, tracks, last_synced_at)
      VALUES (${workspaceId}, ${snapshot.spotifyId}, ${snapshot.url}, ${snapshot.name}, ${snapshot.description}, ${snapshot.imageUrl},
              ${snapshot.ownerName}, ${snapshot.trackCount}, ${snapshot.tracks ? JSON.stringify(snapshot.tracks) : null}::jsonb, now())
      ON CONFLICT (workspace_id, spotify_id) DO UPDATE SET
        url = EXCLUDED.url, name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url,
        owner_name = EXCLUDED.owner_name, track_count = EXCLUDED.track_count,
        tracks = COALESCE(EXCLUDED.tracks, playlists.tracks), last_synced_at = now()`);
  });
  return getPlaylist(workspaceId);
}

export async function removePlaylist(workspaceId: string) {
  await db.exec(sql`DELETE FROM playlists WHERE workspace_id = ${workspaceId}`);
}

export async function disconnectSpotify(workspaceId: string) {
  await db.exec(sql`DELETE FROM spotify_connections WHERE workspace_id = ${workspaceId}`);
}
