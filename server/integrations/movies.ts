import "server-only";
import { env } from "../env";

export type MovieSearchResult = {
  externalId: string;
  title: string;
  originalTitle: string | null;
  year: number | null;
  posterUrl: string | null;
  overview: string | null;
};

export type MovieDetails = MovieSearchResult & {
  genres: string[];
  runtime: number | null;
  backdropUrl: string | null;
};

const BASE = "https://api.themoviedb.org/3";
const IMAGE = "https://image.tmdb.org/t/p";

export class MovieApiUnavailable extends Error {
  constructor() {
    super("Recherche de films indisponible : configurez MOVIE_API_KEY (clé TMDB) dans le fichier .env.");
  }
}

/** Requête TMDB : accepte une clé v3 (paramètre) ou un jeton de lecture v4 (en-tête Bearer). */
async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = env().MOVIE_API_KEY;
  if (!key) throw new MovieApiUnavailable();
  const url = new URL(BASE + path);
  url.searchParams.set("language", "fr-FR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`TMDB ${response.status}`);
  return response.json() as Promise<T>;
}

type TmdbMovie = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  runtime?: number | null;
  genres?: { id: number; name: string }[];
};

const year = (date?: string) => (date && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null);

export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  const data = await tmdb<{ results: TmdbMovie[] }>("/search/movie", { query, include_adult: "false", page: "1" });
  return data.results.slice(0, 12).map((movie) => ({
    externalId: String(movie.id),
    title: movie.title,
    originalTitle: movie.original_title && movie.original_title !== movie.title ? movie.original_title : null,
    year: year(movie.release_date),
    posterUrl: movie.poster_path ? `${IMAGE}/w342${movie.poster_path}` : null,
    overview: movie.overview || null,
  }));
}

export async function getMovieDetails(externalId: string): Promise<MovieDetails> {
  if (!/^\d{1,10}$/.test(externalId)) throw new Error("Identifiant TMDB invalide");
  const movie = await tmdb<TmdbMovie>(`/movie/${externalId}`);
  return {
    externalId: String(movie.id),
    title: movie.title,
    originalTitle: movie.original_title && movie.original_title !== movie.title ? movie.original_title : null,
    year: year(movie.release_date),
    posterUrl: movie.poster_path ? `${IMAGE}/w500${movie.poster_path}` : null,
    backdropUrl: movie.backdrop_path ? `${IMAGE}/w1280${movie.backdrop_path}` : null,
    overview: movie.overview || null,
    runtime: movie.runtime || null,
    genres: (movie.genres ?? []).map((g) => g.name),
  };
}
