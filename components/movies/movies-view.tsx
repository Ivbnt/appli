"use client";

import { Clapperboard, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingDisplay } from "@/components/ui/rating";
import { Segmented } from "@/components/ui/segmented";
import { formatDay } from "@/lib/dates";
import type { MovieStatus } from "@/lib/domain";
import type { Movie, MovieStats } from "@/server/services/movies";
import { AddMovie } from "./add-movie";
import { MovieDetails } from "./movie-details";
import { MoviePoster } from "./movie-poster";

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface px-4 py-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-1 truncate text-xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function MoviesView({ initialMovies, stats, apiAvailable }: { initialMovies: Movie[]; stats: MovieStats; apiAvailable: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();
  const [movies, setMovies] = React.useState(initialMovies);
  React.useEffect(() => setMovies(initialMovies), [initialMovies]);
  const [tab, setTab] = React.useState<MovieStatus>("watchlist");
  const [adding, setAdding] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const movieId = searchParams.get("movie");
    if (movieId) {
      const movie = initialMovies.find((m) => m.id === movieId);
      if (movie) {
        setTab(movie.status);
        setSelectedId(movie.id);
      }
    }
    if (searchParams.get("new")) setAdding(true);
    if (movieId || searchParams.get("new")) router.replace(pathname, { scroll: false });
  }, [searchParams, initialMovies, pathname, router]);

  const visible = movies.filter((m) => m.status === tab);
  const selected = movies.find((m) => m.id === selectedId) ?? null;
  const upsert = (movie: Movie) => setMovies((current) => (current.some((m) => m.id === movie.id) ? current.map((m) => (m.id === movie.id ? movie : m)) : [movie, ...current]));

  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Films vus" value={stats.watched} hint={`${stats.thisYear} cette année`} />
        <Stat label="Note moyenne" value={stats.average !== null ? <RatingDisplay value={stats.average} /> : "—"} />
        <Stat label="Genres favoris" value={stats.topGenres[0]?.genre ?? "—"} hint={stats.topGenres.slice(1).map((g) => g.genre).join(", ") || undefined} />
        <Stat label="Dernier film" value={stats.lastWatched?.title ?? "—"} hint={stats.lastWatched ? formatDay(stats.lastWatched.watchedAt, "medium") : undefined} />
      </div>

      <div className="mb-6 flex items-center justify-between gap-3">
        <Segmented
          label="Liste"
          value={tab}
          onChange={setTab}
          options={[
            { value: "watchlist", label: "À regarder", count: movies.filter((m) => m.status === "watchlist").length },
            { value: "watched", label: "Regardés", count: movies.filter((m) => m.status === "watched").length },
          ]}
        />
        <Button onClick={() => setAdding(true)}>
          <Plus /> <span className="hidden sm:inline">Ajouter un film</span>
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title={tab === "watchlist" ? "Aucun film pour le moment" : "Aucun film regardé"}
          description={tab === "watchlist" ? "Ajoutez un film que vous aimeriez regarder ensemble." : "Les films que vous marquez comme regardés apparaîtront ici, avec vos notes."}
          action={
            <Button onClick={() => setAdding(true)}>
              <Plus /> Ajouter un film
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-5 md:grid-cols-5 xl:grid-cols-6">
          {visible.map((movie, index) => (
            <motion.li
              key={movie.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.3), ease: [0.22, 1, 0.36, 1] }}
            >
              <button type="button" onClick={() => setSelectedId(movie.id)} className="group block w-full text-left outline-none">
                <MoviePoster
                  url={movie.posterUrl}
                  title={movie.title}
                  className="shadow-xs transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring"
                />
                <p className="mt-2.5 truncate text-[13px] font-medium">{movie.title}</p>
                <p className="flex items-center gap-2 text-xs text-muted">
                  {movie.year}
                  {movie.rating !== null && <RatingDisplay value={movie.rating} className="text-xs" />}
                </p>
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <AddMovie
        open={adding}
        onOpenChange={setAdding}
        apiAvailable={apiAvailable}
        defaultStatus={tab}
        existingIds={new Set(movies.map((m) => m.externalId).filter((id): id is string => Boolean(id)))}
        onAdded={(movie) => {
          upsert(movie);
          setTab(movie.status);
          router.refresh();
        }}
      />
      <MovieDetails
        movie={selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onChanged={(movie) => {
          upsert(movie);
          router.refresh();
        }}
        onDeleted={(id) => {
          setMovies((current) => current.filter((m) => m.id !== id));
          router.refresh();
        }}
      />
    </>
  );
}
