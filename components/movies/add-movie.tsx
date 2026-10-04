"use client";

import { Plus, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import type { MovieStatus } from "@/lib/domain";
import { useOnChange } from "@/lib/hooks";
import { addManualMovieAction, addMovieAction } from "@/server/actions/movies";
import type { Movie } from "@/server/services/movies";
import { MoviePoster } from "./movie-poster";

type Result = { externalId: string; title: string; originalTitle: string | null; year: number | null; posterUrl: string | null; overview: string | null };

export function AddMovie({
  open,
  onOpenChange,
  apiAvailable,
  defaultStatus,
  existingIds,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiAvailable: boolean;
  defaultStatus: MovieStatus;
  existingIds: Set<string>;
  onAdded: (movie: Movie) => void;
}) {
  const [mode, setMode] = React.useState<"search" | "manual">(apiAvailable ? "search" : "manual");
  const [status, setStatus] = React.useState<MovieStatus>(defaultStatus);
  const [query, setQuery] = React.useState("");
  const [response, setResponse] = React.useState<{ term: string; results: Result[]; error: string | null } | null>(null);
  const [adding, setAdding] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState({ title: "", year: "", genres: "", runtime: "", overview: "" });
  const [manualErrors, setManualErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = React.useTransition();

  useOnChange(open, (isOpen) => {
    if (!isOpen) return;
    setStatus(defaultStatus);
    setQuery("");
    setResponse(null);
    setManual({ title: "", year: "", genres: "", runtime: "", overview: "" });
    setManualErrors({});
  });

  const term = query.trim();
  const enabled = mode === "search" && term.length >= 2;
  const current = enabled && response?.term === term ? response : null;
  const searching = enabled && !current;
  const results = current?.results ?? [];
  const error = current?.error ?? null;

  React.useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await res.json()) as { results?: Result[]; error?: string; unavailable?: boolean };
        if (!res.ok) {
          setResponse({ term, results: [], error: data.error ?? "Recherche indisponible." });
          if (data.unavailable) setMode("manual");
        } else {
          setResponse({ term, results: data.results ?? [], error: null });
        }
      } catch {
        if (!controller.signal.aborted) setResponse({ term, results: [], error: "Recherche indisponible." });
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, enabled]);

  const add = async (result: Result) => {
    setAdding(result.externalId);
    const response = await addMovieAction({ externalId: result.externalId, status });
    setAdding(null);
    if (!response.ok) return void toast.error(response.error);
    onAdded(response.data);
    toast.success(`« ${response.data.title} » ajouté`);
    onOpenChange(false);
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await addManualMovieAction({
        title: manual.title,
        year: manual.year ? Number(manual.year) : null,
        genres: manual.genres.split(",").map((g) => g.trim()).filter(Boolean),
        runtime: manual.runtime ? Number(manual.runtime) : null,
        overview: manual.overview || null,
        status,
      });
      if (!result.ok) return setManualErrors(result.fieldErrors ?? { title: [result.error] });
      onAdded(result.data);
      toast.success(`« ${result.data.title} » ajouté`);
      onOpenChange(false);
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter un film"
      size="lg"
      footer={
        mode === "manual" ? (
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" form="manual-movie" loading={pending}>
              Ajouter
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Liste"
          value={status}
          onChange={setStatus}
          options={[
            { value: "watchlist", label: "À regarder" },
            { value: "watched", label: "Déjà vu" },
          ]}
        />
        {apiAvailable && (
          <Button variant="link" size="sm" onClick={() => setMode(mode === "search" ? "manual" : "search")} className="text-muted">
            {mode === "search" ? "Saisir manuellement" : "Rechercher dans la base"}
          </Button>
        )}
      </div>

      {mode === "search" ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre du film…" className="pl-9" autoFocus aria-label="Rechercher un film" />
            {searching && <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-subtle" />}
          </div>
          <FormError message={error} />
          <ul className="mt-4 flex flex-col gap-1">
            {results.map((result) => {
              const already = existingIds.has(result.externalId);
              return (
                <li key={result.externalId}>
                  <button
                    type="button"
                    disabled={already || adding !== null}
                    onClick={() => add(result)}
                    className="flex w-full items-center gap-3.5 rounded-xl p-2 text-left transition-colors hover:bg-surface-hover disabled:opacity-60"
                  >
                    <MoviePoster url={result.posterUrl} title={result.title} className="w-12 shrink-0 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {result.title} {result.year && <span className="font-normal text-muted">({result.year})</span>}
                      </span>
                      {result.originalTitle && <span className="block truncate text-xs text-subtle">{result.originalTitle}</span>}
                      {result.overview && <span className="mt-0.5 line-clamp-2 text-xs text-muted">{result.overview}</span>}
                    </span>
                    {adding === result.externalId ? (
                      <Spinner className="text-subtle" />
                    ) : already ? (
                      <span className="text-xs text-subtle">Déjà ajouté</span>
                    ) : (
                      <Plus className="size-4 text-subtle" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {query.trim().length >= 2 && !searching && results.length === 0 && !error && (
            <p className="py-8 text-center text-sm text-muted">Aucun film trouvé.</p>
          )}
        </>
      ) : (
        <form id="manual-movie" onSubmit={submitManual} className="flex flex-col gap-4">
          {!apiAvailable && (
            <p className="rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-xs text-muted">
              La recherche automatique (affiches, résumés) nécessite une clé TMDB : <code className="font-mono">MOVIE_API_KEY</code> dans le fichier .env. En attendant, ajoutez vos films manuellement.
            </p>
          )}
          <Field label="Titre" htmlFor="movie-title" error={manualErrors.title}>
            <Input value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} autoFocus maxLength={200} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Année" htmlFor="movie-year" optional error={manualErrors.year}>
              <Input type="number" inputMode="numeric" value={manual.year} onChange={(e) => setManual({ ...manual, year: e.target.value })} min={1870} max={2200} />
            </Field>
            <Field label="Durée (min)" htmlFor="movie-runtime" optional error={manualErrors.runtime}>
              <Input type="number" inputMode="numeric" value={manual.runtime} onChange={(e) => setManual({ ...manual, runtime: e.target.value })} min={1} />
            </Field>
          </div>
          <Field label="Genres" htmlFor="movie-genres" optional hint="Séparés par des virgules : Drame, Comédie">
            <Input value={manual.genres} onChange={(e) => setManual({ ...manual, genres: e.target.value })} />
          </Field>
          <Field label="Résumé" htmlFor="movie-overview" optional>
            <Textarea value={manual.overview} onChange={(e) => setManual({ ...manual, overview: e.target.value })} rows={3} />
          </Field>
        </form>
      )}
    </Modal>
  );
}
