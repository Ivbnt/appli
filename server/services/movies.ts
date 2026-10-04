import "server-only";
import { todayISO } from "@/lib/dates";
import type { MovieStatus } from "@/lib/domain";
import { db, isUniqueViolation, sql } from "../db";
import { NotFoundError, UserError } from "../errors";
import { getMovieDetails } from "../integrations/movies";

export type MovieReview = { userId: string; rating: number; comment: string | null };

export type Movie = {
  id: string;
  externalId: string | null;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  year: number | null;
  genres: string[];
  runtime: number | null;
  overview: string | null;
  status: MovieStatus;
  watchedAt: string | null;
  rating: number | null;
  notes: string | null;
  addedById: string | null;
  createdAt: Date;
  reviews: MovieReview[];
};

const SELECT = sql`
  SELECT m.id, m.external_id, m.title, m.poster_url, m.backdrop_url, m.year, m.genres, m.runtime, m.overview, m.status,
         m.watched_at, m.rating, m.notes, m.added_by_id, m.created_at,
         COALESCE((SELECT json_agg(json_build_object('userId', r.user_id, 'rating', r.rating, 'comment', r.comment))
                   FROM movie_reviews r WHERE r.movie_id = m.id), '[]') AS reviews
  FROM movies m`;

export function listMovies(workspaceId: string) {
  return db.many<Movie>(sql`${SELECT} WHERE m.workspace_id = ${workspaceId}
    ORDER BY CASE WHEN m.status = 'watched' THEN m.watched_at END DESC NULLS LAST, m.created_at DESC`);
}

export function getMovie(workspaceId: string, movieId: string) {
  return db.maybe<Movie>(sql`${SELECT} WHERE m.workspace_id = ${workspaceId} AND m.id = ${movieId}`);
}

export async function addMovieFromApi(workspaceId: string, userId: string, externalId: string, status: MovieStatus) {
  // Les métadonnées sont récupérées côté serveur : le navigateur ne fournit que l'identifiant TMDB.
  const details = await getMovieDetails(externalId);
  try {
    const row = await db.one<{ id: string }>(sql`
      INSERT INTO movies (workspace_id, external_id, title, poster_url, backdrop_url, year, genres, runtime, overview, status,
                          watched_at, added_by_id)
      VALUES (${workspaceId}, ${details.externalId}, ${details.title}, ${details.posterUrl}, ${details.backdropUrl}, ${details.year},
              ${details.genres}::text[], ${details.runtime}, ${details.overview}, ${status},
              ${status === "watched" ? todayISO() : null}, ${userId})
      RETURNING id`);
    return (await getMovie(workspaceId, row.id))!;
  } catch (error) {
    if (isUniqueViolation(error)) throw new UserError("Ce film est déjà dans vos listes.");
    throw error;
  }
}

export async function addManualMovie(
  workspaceId: string,
  userId: string,
  input: { title: string; year: number | null; genres: string[]; runtime: number | null; overview: string | null; status: MovieStatus },
) {
  const row = await db.one<{ id: string }>(sql`
    INSERT INTO movies (workspace_id, title, year, genres, runtime, overview, status, watched_at, added_by_id)
    VALUES (${workspaceId}, ${input.title}, ${input.year}, ${input.genres}::text[], ${input.runtime}, ${input.overview}, ${input.status},
            ${input.status === "watched" ? todayISO() : null}, ${userId})
    RETURNING id`);
  return (await getMovie(workspaceId, row.id))!;
}

export async function updateMovie(workspaceId: string, movieId: string, input: { status: MovieStatus; watchedAt: string | null; notes: string | null }) {
  const count = await db.exec(sql`
    UPDATE movies SET status = ${input.status}, notes = ${input.notes},
      watched_at = ${input.status === "watched" ? input.watchedAt ?? todayISO() : null}
    WHERE id = ${movieId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Film");
  return (await getMovie(workspaceId, movieId))!;
}

/** Chaque membre note le film ; la note du film est la moyenne des deux. */
export async function reviewMovie(workspaceId: string, userId: string, movieId: string, rating: number, comment: string | null) {
  return db.tx(async (tx) => {
    const movie = await tx.maybe<{ id: string }>(sql`SELECT id FROM movies WHERE id = ${movieId} AND workspace_id = ${workspaceId} FOR UPDATE`);
    if (!movie) throw new NotFoundError("Film");
    await tx.exec(sql`
      INSERT INTO movie_reviews (movie_id, user_id, rating, comment) VALUES (${movieId}, ${userId}, ${rating}, ${comment})
      ON CONFLICT (movie_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment`);
    await tx.exec(sql`
      UPDATE movies SET rating = (SELECT avg(rating)::real FROM movie_reviews WHERE movie_id = ${movieId}),
        status = 'watched', watched_at = COALESCE(watched_at, ${todayISO()})
      WHERE id = ${movieId}`);
  }).then(() => getMovie(workspaceId, movieId).then((m) => m!));
}

export async function deleteMovie(workspaceId: string, movieId: string) {
  const count = await db.exec(sql`DELETE FROM movies WHERE id = ${movieId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Film");
}

export type MovieStats = {
  watched: number;
  average: number | null;
  thisYear: number;
  topGenres: { genre: string; count: number }[];
  lastWatched: { id: string; title: string; watchedAt: string } | null;
};

export async function movieStats(workspaceId: string): Promise<MovieStats> {
  const [totals, genres, last] = await Promise.all([
    db.one<{ watched: number; average: number | null; thisYear: number }>(sql`
      SELECT count(*)::int AS watched, round(avg(rating)::numeric, 1)::float AS average,
             count(*) FILTER (WHERE watched_at >= date_trunc('year', current_date))::int AS this_year
      FROM movies WHERE workspace_id = ${workspaceId} AND status = 'watched'`),
    db.many<{ genre: string; count: number }>(sql`
      SELECT genre, count(*)::int AS count FROM movies, unnest(genres) AS genre
      WHERE workspace_id = ${workspaceId} AND status = 'watched'
      GROUP BY genre ORDER BY count DESC, genre LIMIT 3`),
    db.maybe<{ id: string; title: string; watchedAt: string }>(sql`
      SELECT id, title, watched_at FROM movies
      WHERE workspace_id = ${workspaceId} AND status = 'watched' AND watched_at IS NOT NULL
      ORDER BY watched_at DESC, updated_at DESC LIMIT 1`),
  ]);
  return { ...totals, topGenres: genres, lastWatched: last };
}
