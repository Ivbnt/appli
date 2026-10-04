"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Switch } from "@/components/ui/switch";
import type { Card } from "@/lib/fun/cards-data";
import { useLocalState } from "@/lib/fun/local-state";
import { cn } from "@/lib/utils";

export type DrawnCard = Card & { deckId: string; deckTitle: string; emoji: string };

/** Carte tirée, avec une animation de retournement. */
export function GameCard({ card, label, empty, className }: { card: DrawnCard | null; label: string; empty: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("relative min-h-64 [perspective:1200px]", className)} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.article
          key={card ? `${card.deckId}:${card.n}` : "empty"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -70, y: 12 }}
          animate={{ opacity: 1, rotateY: 0, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 60, y: -8 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-64 flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8"
        >
          {card ? (
            <>
              <div className="flex items-center justify-between gap-3 text-xs text-muted">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className="text-base">
                    {card.emoji}
                  </span>
                  <span className="truncate">{card.group ?? card.deckTitle}</span>
                </span>
                <span className="shrink-0 tabular">
                  {label} n° {card.n}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-center py-6">
                {card.title && <p className="text-title mb-2">{card.title}</p>}
                <p className={cn("text-balance", card.title ? "text-base text-muted" : "text-xl leading-snug font-medium tracking-tight sm:text-2xl")}>{card.text}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted">{empty}</div>
          )}
        </motion.article>
      </AnimatePresence>
    </div>
  );
}

/** Option « Contenu 18+ », mémorisée sur cet appareil et partagée entre les deux jeux. */
export function useAdultContent() {
  return useLocalState("fun:adult", false);
}

export function AdultToggle() {
  const [adult, setAdult] = useAdultContent();
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
      <span>
        <span className="block text-sm font-medium">Contenu 18+</span>
        <span className="block text-xs text-muted">Affiche les niveaux et cartes intimes. Masqués par défaut, mémorisé sur cet appareil.</span>
      </span>
      <Switch checked={adult} onCheckedChange={setAdult} aria-label="Afficher le contenu 18+" />
    </label>
  );
}

export function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

/** Tire une carte au hasard parmi celles qui n'ont pas encore été tirées. */
export function drawFrom<T extends { key: string }>(pool: T[], seen: string[]): T | null {
  return pickRandom(pool.filter((item) => !seen.includes(item.key))) ?? null;
}

export function RuleBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-2xl bg-surface-muted px-4 py-3.5 text-sm">
      <p className="mb-1 font-medium">{title}</p>
      <div className="flex flex-col gap-1.5 text-muted">{children}</div>
    </aside>
  );
}
