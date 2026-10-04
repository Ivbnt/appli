import "server-only";
import { decrypt, encrypt } from "../auth/crypto";
import { db, sql } from "../db";
import { env } from "../env";

export const SPOTIFY_SCOPES = "playlist-read-private playlist-read-collaborative";

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: string[];
  album: string;
  imageUrl: string | null;
  durationMs: number;
  url: string;
  addedAt: string | null;
};

export type PlaylistSnapshot = {
  spotifyId: string;
  url: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerName: string | null;
  trackCount: number | null;
  tracks: SpotifyTrack[] | null;
};

export const redirectUri = () => new URL("/api/spotify/callback", env().APP_URL).toString();

/** Extrait l'identifiant d'une playlist depuis un lien, une URI ou un identifiant brut. */
export function parsePlaylistId(input: string): string | null {
  const value = input.trim();
  const match =
    value.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]{10,40})/) ??
    value.match(/^spotify:playlist:([A-Za-z0-9]{10,40})$/) ??
    value.match(/^([A-Za-z0-9]{22})$/);
  return match?.[1] ?? null;
}

export function authorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env().SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "false",
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const credentials = Buffer.from(`${env().SPOTIFY_CLIENT_ID}:${env().SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Spotify token ${response.status}`);
  return response.json() as Promise<TokenResponse>;
}

export async function exchangeCode(code: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri() });
}

/** Enregistre la connexion de l'espace (jetons chiffrés en AES-256-GCM). */
export async function saveConnection(workspaceId: string, userId: string, tokens: TokenResponse) {
  const me = await spotifyFetch<{ id: string; display_name: string | null }>("/me", tokens.access_token);
  await db.exec(sql`
    INSERT INTO spotify_connections (workspace_id, spotify_user_id, display_name, access_token_enc, refresh_token_enc, expires_at, scope, connected_by_id)
    VALUES (${workspaceId}, ${me.id}, ${me.display_name}, ${encrypt(tokens.access_token)}, ${encrypt(tokens.refresh_token ?? "")},
            ${new Date(Date.now() + tokens.expires_in * 1000)}, ${tokens.scope}, ${userId})
    ON CONFLICT (workspace_id) DO UPDATE SET
      spotify_user_id = EXCLUDED.spotify_user_id, display_name = EXCLUDED.display_name,
      access_token_enc = EXCLUDED.access_token_enc, refresh_token_enc = EXCLUDED.refresh_token_enc,
      expires_at = EXCLUDED.expires_at, scope = EXCLUDED.scope, connected_by_id = EXCLUDED.connected_by_id`);
}

export async function getConnection(workspaceId: string) {
  return db.maybe<{ spotifyUserId: string; displayName: string | null; expiresAt: Date; accessTokenEnc: string; refreshTokenEnc: string }>(sql`
    SELECT spotify_user_id, display_name, expires_at, access_token_enc, refresh_token_enc
    FROM spotify_connections WHERE workspace_id = ${workspaceId}`);
}

/** Jeton d'accès valide (renouvelé automatiquement s'il expire dans moins d'une minute). */
async function accessToken(workspaceId: string): Promise<string | null> {
  const connection = await getConnection(workspaceId);
  if (!connection) return null;
  if (connection.expiresAt.getTime() - Date.now() > 60_000) return decrypt(connection.accessTokenEnc);
  const refreshToken = decrypt(connection.refreshTokenEnc);
  if (!refreshToken) return null;
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  await db.exec(sql`
    UPDATE spotify_connections SET access_token_enc = ${encrypt(tokens.access_token)},
      refresh_token_enc = ${encrypt(tokens.refresh_token ?? refreshToken)},
      expires_at = ${new Date(Date.now() + tokens.expires_in * 1000)}
    WHERE workspace_id = ${workspaceId}`);
  return tokens.access_token;
}

async function spotifyFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(path.startsWith("https://") ? path : `https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) throw new Error("Playlist introuvable ou privée.");
  if (!response.ok) throw new Error(`Spotify ${response.status}`);
  return response.json() as Promise<T>;
}

type ApiImage = { url: string; width: number | null };
type ApiPlaylist = {
  id: string;
  name: string;
  description: string | null;
  images: ApiImage[] | null;
  owner: { display_name: string | null };
  external_urls: { spotify: string };
  tracks: { total: number };
};
type ApiTrackPage = {
  next: string | null;
  items: {
    added_at: string | null;
    track: {
      id: string | null;
      name: string;
      duration_ms: number;
      artists: { name: string }[];
      album: { name: string; images: ApiImage[] };
      external_urls: { spotify?: string };
      type: string;
    } | null;
  }[];
};

const stripHtml = (value: string | null) => (value ? value.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").trim() || null : null);
const smallestImage = (images: ApiImage[] | null | undefined) =>
  images && images.length ? [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0)).find((i) => (i.width ?? 0) >= 64)?.url ?? images[0]!.url : null;

/** Playlist complète via l'API (métadonnées uniquement — aucun fichier audio). */
export async function fetchPlaylistWithApi(workspaceId: string, playlistId: string): Promise<PlaylistSnapshot | null> {
  const token = await accessToken(workspaceId);
  if (!token) return null;
  const playlist = await spotifyFetch<ApiPlaylist>(`/playlists/${playlistId}?fields=id,name,description,images,owner(display_name),external_urls,tracks(total)`, token);
  const tracks: SpotifyTrack[] = [];
  let next: string | null = `/playlists/${playlistId}/tracks?limit=100&fields=next,items(added_at,track(id,name,duration_ms,type,artists(name),album(name,images),external_urls))`;
  while (next && tracks.length < 1000) {
    const page: ApiTrackPage = await spotifyFetch<ApiTrackPage>(next, token);
    for (const item of page.items) {
      const t = item.track;
      if (!t || t.type !== "track" || !t.id) continue;
      tracks.push({
        id: t.id,
        name: t.name,
        artists: t.artists.map((a) => a.name),
        album: t.album.name,
        imageUrl: smallestImage(t.album.images),
        durationMs: t.duration_ms,
        url: t.external_urls.spotify ?? `https://open.spotify.com/track/${t.id}`,
        addedAt: item.added_at,
      });
    }
    next = page.next;
  }
  return {
    spotifyId: playlist.id,
    url: playlist.external_urls.spotify,
    name: playlist.name,
    description: stripHtml(playlist.description),
    imageUrl: playlist.images?.[0]?.url ?? null,
    ownerName: playlist.owner.display_name,
    trackCount: playlist.tracks.total,
    tracks,
  };
}

/** Sans connexion API : nom et pochette via oEmbed (public, sans authentification). */
export async function fetchPlaylistWithOEmbed(playlistId: string): Promise<PlaylistSnapshot> {
  const url = `https://open.spotify.com/playlist/${playlistId}`;
  let name = "Notre playlist";
  let imageUrl: string | null = null;
  try {
    const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const data = (await response.json()) as { title?: string; thumbnail_url?: string };
      name = data.title || name;
      imageUrl = data.thumbnail_url ?? null;
    }
  } catch {
    // le lecteur intégré restera disponible
  }
  return { spotifyId: playlistId, url, name, description: null, imageUrl, ownerName: null, trackCount: null, tracks: null };
}
