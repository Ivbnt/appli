"use client";

import { Check, Eye, Trash2, Undo2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useMembers, useShell } from "@/components/layout/shell-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/input";
import { RatingDisplay, RatingInput } from "@/components/ui/rating";
import { formatDay, todayISO } from "@/lib/dates";
import { useOnChange } from "@/lib/hooks";
import { formatDuration } from "@/lib/utils";
import { deleteMovieAction, reviewMovieAction, updateMovieAction } from "@/server/actions/movies";
import type { Movie } from "@/server/services/movies";
import { MoviePoster } from "./movie-poster";

export function MovieDetails({
  movie,
  onOpenChange,
  onChanged,
  onDeleted,
}: {
  movie: Movie | null;
  onOpenChange: (open: boolean) => void;
  onChanged: (movie: Movie) => void;
  onDeleted: (id: string) => void;
}) {
  const { user } = useShell();
  const members = useMembers();
  const confirm = useConfirm();
  const myReview = movie?.reviews.find((r) => r.userId === user.id);
  const [rating, setRating] = React.useState<number | null>(null);
  const [comment, setComment] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [watchedAt, setWatchedAt] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  useOnChange(movie, () => {
    setRating(myReview?.rating ?? null);
    setComment(myReview?.comment ?? "");
    setNotes(movie?.notes ?? "");
    setWatchedAt(movie?.watchedAt ?? null);
  });

  if (!movie) return null;

  const setStatus = (status: Movie["status"], date: string | null = watchedAt) =>
    startTransition(async () => {
      const result = await updateMovieAction({ id: movie.id, status, watchedAt: status === "watched" ? date ?? todayISO() : null, notes: notes || null });
      if (!result.ok) return void toast.error(result.error);
      onChanged(result.data);
      toast.success(status === "watched" ? "Marqué comme regardé" : "Remis dans « À regarder »");
    });

  const saveReview = () =>
    startTransition(async () => {
      if (!rating) return void toast.error("Choisissez une note de 1 à 10.");
      const result = await reviewMovieAction({ movieId: movie.id, rating, comment: comment || null });
      if (!result.ok) return void toast.error(result.error);
      onChanged(result.data);
      toast.success("Votre avis est enregistré");
    });

  const saveNotes = () =>
    startTransition(async () => {
      if ((movie.notes ?? "") === notes) return;
      const result = await updateMovieAction({ id: movie.id, status: movie.status, watchedAt: movie.watchedAt, notes: notes || null });
      if (result.ok) onChanged(result.data);
    });

  const remove = async () => {
    if (!(await confirm({ title: "Supprimer ce film ?", description: `« ${movie.title} » et vos avis seront supprimés.`, confirmLabel: "Supprimer", destructive: true }))) return;
    const result = await deleteMovieAction({ id: movie.id });
    if (!result.ok) return void toast.error(result.error);
    onDeleted(movie.id);
    onOpenChange(false);
  };

  return (
    <Drawer
      open
      onOpenChange={onOpenChange}
      title={movie.title}
      description={[movie.year, movie.runtime ? formatDuration(movie.runtime) : null].filter(Boolean).join(" · ") || undefined}
      footer={
        <>
          <Button variant="danger-ghost" size="icon" className="mr-auto" onClick={remove} aria-label="Supprimer">
            <Trash2 />
          </Button>
          {movie.status === "watchlist" ? (
            <Button onClick={() => setStatus("watched", todayISO())} loading={pending}>
              <Eye /> Marquer comme regardé
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setStatus("watchlist")} loading={pending}>
              <Undo2 /> Remettre à regarder
            </Button>
          )}
        </>
      }
    >
      {movie.backdropUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- image TMDB
        <img src={movie.backdropUrl} alt="" className="-mx-5 mb-5 aspect-[16/9] w-[calc(100%+2.5rem)] max-w-none object-cover md:-mx-6 md:w-[calc(100%+3rem)]" />
      )}
      <div className="flex gap-4">
        <MoviePoster url={movie.posterUrl} title={movie.title} className="w-24 shrink-0" />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {movie.genres.map((g) => (
              <Badge key={g} tone="outline">
                {g}
              </Badge>
            ))}
          </div>
          {movie.status === "watched" && (
            <p className="mt-2 text-xs text-muted">
              <Check className="mr-1 inline size-3 text-success" />
              Vu {movie.watchedAt ? `le ${formatDay(movie.watchedAt, "long")}` : ""}
            </p>
          )}
          {movie.rating !== null && <RatingDisplay value={movie.rating} className="mt-2 text-2xl" />}
        </div>
      </div>
      {movie.overview && <p className="mt-5 text-sm leading-relaxed text-muted">{movie.overview}</p>}

      {movie.status === "watched" && (
        <section className="mt-7">
          <h3 className="mb-3 text-sm font-semibold">Vos avis</h3>
          <div className="mb-3">
            <span className="mb-1.5 block text-xs text-muted">Date de visionnage</span>
            <DatePicker value={watchedAt} onChange={(v) => { setWatchedAt(v); if (v) setStatus("watched", v); }} clearable={false} />
          </div>
          <div className="flex flex-col gap-3">
            {members.map((member) => {
              const review = movie.reviews.find((r) => r.userId === member.id);
              if (member.id === user.id) return null;
              return (
                <div key={member.id} className="flex items-start gap-3 rounded-xl bg-surface-muted p-3">
                  <Avatar name={member.name} src={member.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{member.name}</p>
                    {review ? (
                      <>
                        <RatingDisplay value={review.rating} className="text-sm" />
                        {review.comment && <p className="mt-1 text-muted">{review.comment}</p>}
                      </>
                    ) : (
                      <p className="text-muted">Pas encore noté.</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-medium">Votre note</p>
              <RatingInput value={rating} onChange={setRating} label="Votre note sur 10" />
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Un mot sur le film ?" rows={2} className="mt-3" />
              <Button size="sm" className="mt-3" onClick={saveReview} loading={pending} disabled={!rating}>
                Enregistrer mon avis
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="mt-7">
        <h3 className="mb-2 text-sm font-semibold">Notes</h3>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3} placeholder="Recommandé par…, à voir en VO…" />
      </section>
    </Drawer>
  );
}
