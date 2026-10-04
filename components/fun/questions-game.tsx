"use client";

import { ChevronDown, RotateCcw, Shuffle } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { QUESTION_LEVELS } from "@/lib/fun/cards-data";
import { useLocalState } from "@/lib/fun/local-state";
import { cn } from "@/lib/utils";
import { AdultToggle, drawFrom, GameCard, RuleBox, useAdultContent, type DrawnCard } from "./game-card";

type Entry = DrawnCard & { key: string };

const ENTRIES: Entry[] = QUESTION_LEVELS.flatMap((level) =>
  level.cards.map((card) => ({ ...card, key: `${level.id}:${card.n}`, deckId: level.id, deckTitle: level.title, emoji: level.emoji })),
);

/** 520 questions en 10 niveaux, « du on rigole au pourquoi tu m'as demandé ça ? ». */
export function QuestionsGame() {
  const [adult] = useAdultContent();
  const [mode, setMode] = React.useState<"draw" | "list">("draw");
  const [selected, setSelected] = useLocalState<string[]>("fun:questions:levels", ["q1"]);
  const [seen, setSeen] = useLocalState<string[]>("fun:questions:seen", []);
  const [current, setCurrent] = React.useState<Entry | null>(null);

  const levels = QUESTION_LEVELS.filter((level) => adult || !level.adult);
  const active = selected.filter((id) => levels.some((level) => level.id === id));
  const pool = ENTRIES.filter((entry) => active.includes(entry.deckId));
  const remaining = pool.filter((entry) => !seen.includes(entry.key)).length;

  const toggle = (id: string) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const draw = () => {
    const next = drawFrom(pool, seen);
    setCurrent(next);
    if (next) setSeen((list) => [...list, next.key]);
  };

  const reset = () => {
    setSeen((list) => list.filter((key) => !pool.some((entry) => entry.key === key)));
    setCurrent(null);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Affichage"
          value={mode}
          onChange={setMode}
          options={[
            { value: "draw", label: "Tirage" },
            { value: "list", label: "Toutes les questions" },
          ]}
        />
        <p className="text-sm text-muted">Montez en intensité, niveau après niveau.</p>
      </div>

      {mode === "draw" ? (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Niveaux</legend>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => {
                const on = active.includes(level.id);
                return (
                  <button
                    key={level.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(level.id)}
                    title={level.title}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    <span aria-hidden>{level.emoji}</span> {level.id.slice(1)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              {active.length === 0
                ? "Choisissez au moins un niveau."
                : active
                    .map((id) => levels.find((level) => level.id === id)!.title.replace(/^Niveau \d+ — /, ""))
                    .join(" · ")}
            </p>
          </fieldset>

          <GameCard
            card={current}
            label="Question"
            empty={remaining === 0 && active.length > 0 ? "Toutes les questions de ces niveaux ont été tirées." : "Tirez une question pour commencer."}
          />

          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={draw} disabled={remaining === 0}>
              <Shuffle /> {current ? "Question suivante" : "Tirer une question"}
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted tabular">
              {remaining} question{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} sur {pool.length}
              {pool.length - remaining > 0 && (
                <button type="button" onClick={reset} className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline">
                  <RotateCcw className="size-3" /> Recommencer
                </button>
              )}
            </p>
          </div>

          <RuleBox title="La règle qui rend le jeu meilleur">
            <p>
              À chaque question, l&apos;autre peut répondre <strong className="font-medium text-foreground">« passe »</strong>, mais doit alors choisir une question du même
              niveau à poser à l&apos;autre.
            </p>
            <p>
              Quand une réponse est intéressante, ne passez pas tout de suite à la suivante : la meilleure question est souvent le{" "}
              <strong className="font-medium text-foreground">« pourquoi ? »</strong> qui vient juste après.
            </p>
          </RuleBox>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {levels.map((level) => (
            <details key={level.id} className="group rounded-2xl border border-border bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="text-lg">
                  {level.emoji}
                </span>
                <span className="flex-1 text-sm font-medium">{level.title}</span>
                <span className="text-xs text-muted tabular">{level.cards.length}</span>
                <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <ol className="flex flex-col gap-2.5 border-t border-border px-4 py-4 text-sm">
                {level.cards.map((card) => (
                  <li key={card.n} className="flex gap-3">
                    <span className="w-8 shrink-0 text-right text-xs leading-5 text-subtle tabular">{card.n}</span>
                    <span>{card.text}</span>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}

      <AdultToggle />
    </div>
  );
}
