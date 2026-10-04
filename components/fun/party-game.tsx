"use client";

import { ChevronDown, ChevronRight, Eye, EyeOff, Plus, RotateCcw, Shuffle, Sparkles, Ticket } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { CHALLENGE_DECKS, type ChallengePile } from "@/lib/fun/cards-data";
import { useLocalState } from "@/lib/fun/local-state";
import { cn } from "@/lib/utils";
import { AdultToggle, drawFrom, GameCard, pickRandom, RuleBox, useAdultContent, type DrawnCard } from "./game-card";

type Entry = DrawnCard & { key: string; pile: ChallengePile; adult: boolean };

const ENTRIES: Entry[] = CHALLENGE_DECKS.flatMap((deck) =>
  deck.cards.map((card) => ({
    ...card,
    key: `c:${card.n}`,
    deckId: deck.id,
    deckTitle: deck.title,
    emoji: deck.emoji,
    pile: deck.pile,
    adult: deck.adult,
  })),
);

const byDeck = (id: string) => ENTRIES.filter((entry) => entry.deckId === id);
const MISSIONS = byDeck("c2");
const MODIFIERS = byDeck("modifiers");
const SPECIALS = byDeck("special");

/** Catégories que l'on peut piocher librement (modificateurs et cartes spéciales s'ajoutent à un défi). */
const DRAWABLE = CHALLENGE_DECKS.filter((deck) => deck.id !== "modifiers" && deck.id !== "special");

const PILES: { id: ChallengePile; emoji: string; label: string }[] = [
  { id: "party", emoji: "🟢", label: "Party" },
  { id: "couple", emoji: "❤️", label: "Couple" },
  { id: "afterdark", emoji: "🌙", label: "After Dark" },
];

/** Mode de jeu recommandé : la soirée monte en intensité, acte par acte. */
const ACTS = [
  { title: "Acte I — Chaos", from: 1, to: 60, adult: false },
  { title: "Acte II — Psycho / culot", from: 61, to: 120, adult: false },
  { title: "Acte III — Compétition / mystère", from: 121, to: 160, adult: false },
  { title: "Acte IV — Couple / flirt", from: 161, to: 200, adult: false },
  { title: "Acte V — After Dark", from: 201, to: 220, adult: true },
  { title: "Acte VI — Sex", from: 221, to: 250, adult: true },
  { title: "Acte final", from: 261, to: 270, adult: false },
];

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

export function PartyGame({ players }: { players: string[] }) {
  const reduce = useReducedMotion();
  const [adult] = useAdultContent();
  const [mode, setMode] = React.useState<"free" | "acts" | "list">("free");
  const [decks, setDecks] = useLocalState<string[]>("fun:party:decks", DRAWABLE.filter((d) => d.pile === "party").map((d) => d.id));
  const [act, setAct] = useLocalState("fun:party:act", 0);
  const [seen, setSeen] = useLocalState<string[]>("fun:party:seen", []);
  const [passes, setPasses] = useLocalState<string[]>("fun:party:passes", []);
  const [current, setCurrent] = React.useState<Entry | null>(null);
  const [extras, setExtras] = React.useState<Entry[]>([]);

  const visibleDecks = DRAWABLE.filter((deck) => adult || !deck.adult);
  const acts = ACTS.filter((a) => adult || !a.adult);
  const currentAct = acts[Math.min(act, acts.length - 1)]!;

  const pool =
    mode === "acts"
      ? ENTRIES.filter((e) => e.n >= currentAct.from && e.n <= currentAct.to && (adult || !e.adult))
      : ENTRIES.filter((e) => decks.includes(e.deckId) && (adult || !e.adult));
  const remaining = pool.filter((e) => !seen.includes(e.key)).length;

  const draw = () => {
    const next = drawFrom(pool, seen);
    setCurrent(next);
    setExtras([]);
    if (next) setSeen((list) => [...list, next.key]);
  };

  const addExtra = (from: Entry[]) => {
    const options = from.filter((e) => !extras.some((x) => x.key === e.key));
    const pick = pickRandom(options);
    if (pick) setExtras((list) => [...list, pick]);
  };

  const toggleDeck = (id: string) => setDecks((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const selectPile = (pile: ChallengePile) => setDecks(visibleDecks.filter((d) => d.pile === pile).map((d) => d.id));

  const newEvening = () => {
    setSeen([]);
    setPasses([]);
    setAct(0);
    setCurrent(null);
    setExtras([]);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Mode de jeu"
          value={mode}
          onChange={(value) => {
            setMode(value);
            setCurrent(null);
            setExtras([]);
          }}
          options={[
            { value: "free", label: "Libre" },
            { value: "acts", label: "Soirée guidée" },
            { value: "list", label: "Toutes les cartes" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={newEvening}>
          <RotateCcw /> Nouvelle soirée
        </Button>
      </div>

      {mode === "list" ? (
        <DeckList adult={adult} />
      ) : (
        <>
          {mode === "free" ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Catégories</legend>
              <div className="flex flex-wrap gap-2">
                {PILES.filter((pile) => adult || pile.id !== "afterdark").map((pile) => (
                  <Button key={pile.id} variant="secondary" size="sm" onClick={() => selectPile(pile.id)}>
                    <span aria-hidden>{pile.emoji}</span> Pile {pile.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleDecks.map((deck) => {
                  const on = decks.includes(deck.id);
                  return (
                    <button
                      key={deck.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDeck(deck.id)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
                      )}
                    >
                      <span aria-hidden>{deck.emoji}</span> {deck.title}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-muted tabular">
                  Étape {Math.min(act, acts.length - 1) + 1} sur {acts.length} · cartes {currentAct.from}–{currentAct.to}
                </p>
                <p className="truncate font-medium">{currentAct.title}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" disabled={act === 0} onClick={() => setAct((a) => Math.max(0, a - 1))}>
                  Précédent
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={act >= acts.length - 1}
                  onClick={() => {
                    setAct((a) => Math.min(acts.length - 1, a + 1));
                    setCurrent(null);
                    setExtras([]);
                  }}
                >
                  Acte suivant <ChevronRight />
                </Button>
              </div>
            </div>
          )}

          <GameCard
            card={current}
            label="Défi"
            empty={remaining === 0 && pool.length > 0 ? "Toutes les cartes ont été jouées : passez à la suite ou commencez une nouvelle soirée." : "Tirez un défi pour commencer."}
          />

          <AnimatePresence initial={false}>
            {extras.map((extra) => (
              <motion.div
                key={extra.key}
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="-mt-3 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft px-4 py-3 text-sm"
              >
                <span aria-hidden className="text-base">
                  {extra.emoji}
                </span>
                <span>
                  <span className="font-semibold">{extra.title}</span> — {extra.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="lg" onClick={draw} disabled={remaining === 0}>
                <Shuffle /> {current ? "Défi suivant" : "Tirer un défi"}
              </Button>
              {current?.deckId === "positions" && (
                <Button size="lg" variant="secondary" onClick={() => addExtra(MODIFIERS)}>
                  <Plus /> Modificateur
                </Button>
              )}
              {current && current.deckId !== "special" && (
                <Button size="lg" variant="secondary" onClick={() => addExtra(SPECIALS)}>
                  <Sparkles /> Carte spéciale
                </Button>
              )}
            </div>
            <p className="text-xs text-muted tabular">
              {remaining} carte{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} sur {pool.length}
            </p>
          </div>

          <Passes players={players} used={passes} onChange={setPasses} />
          <SecretMissions players={players} />

          <RuleBox title="Règle générale">
            <p>Chaque joueur dispose d&apos;un PASS pour toute la soirée. Personne n&apos;est obligé de réaliser un défi qui le met mal à l&apos;aise.</p>
            {adult && (
              <p>
                Positions les plus physiques (variantes wheelbarrow, debout) : privilégiez un environnement stable et arrêtez dès que l&apos;équilibre, la force ou la mobilité ne
                permettent pas de les faire confortablement.
              </p>
            )}
          </RuleBox>
        </>
      )}

      <AdultToggle />
    </div>
  );
}

function Passes({ players, used, onChange }: { players: string[]; used: string[]; onChange: (next: string[]) => void }) {
  return (
    <section className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium">PASS</span>
      {players.map((player) => {
        const isUsed = used.includes(player);
        return (
          <button
            key={player}
            type="button"
            aria-pressed={isUsed}
            onClick={() => onChange(isUsed ? used.filter((p) => p !== player) : [...used, player])}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
              isUsed ? "border-border bg-surface-muted text-subtle line-through" : "border-accent/30 bg-accent-soft text-accent-soft-foreground",
            )}
          >
            <Ticket className="size-3.5" /> {firstName(player)} {isUsed ? "· utilisé" : "· disponible"}
          </button>
        );
      })}
    </section>
  );
}

/** Missions secrètes : chacun pioche un objectif privé, à accomplir pendant toute la soirée sans se faire repérer. */
function SecretMissions({ players }: { players: string[] }) {
  const [missions, setMissions] = useLocalState<Record<string, number>>("fun:party:missions", {});
  const [revealed, setRevealed] = React.useState<string | null>(null);

  const drawMission = (player: string) => {
    const taken = Object.values(missions);
    const options = MISSIONS.filter((m) => !taken.includes(m.n));
    const pick = pickRandom(options) ?? MISSIONS[0]!;
    setMissions((all) => ({ ...all, [player]: pick.n }));
    setRevealed(player);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-medium">🕵️ Missions secrètes</p>
      <p className="mb-3 text-xs text-muted">En parallèle de la soirée : chacun garde un objectif privé et tente de l&apos;accomplir sans se faire repérer.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {players.map((player) => {
          const mission = MISSIONS.find((m) => m.n === missions[player]);
          const isOpen = revealed === player;
          return (
            <div key={player} className="flex flex-col gap-2 rounded-xl bg-surface-muted p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{firstName(player)}</span>
                {mission ? (
                  <Button variant="ghost" size="sm" onClick={() => setRevealed(isOpen ? null : player)}>
                    {isOpen ? <EyeOff /> : <Eye />} {isOpen ? "Cacher" : "Voir"}
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => drawMission(player)}>
                    Piocher
                  </Button>
                )}
              </div>
              {mission && <p className={cn("text-sm", !isOpen && "text-muted")}>{isOpen ? mission.text : `Mission cachée : seul·e ${firstName(player)} doit la lire.`}</p>}
              {mission && isOpen && (
                <button type="button" onClick={() => drawMission(player)} className="self-start text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
                  Changer de mission
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DeckList({ adult }: { adult: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {CHALLENGE_DECKS.filter((deck) => adult || !deck.adult).map((deck) => (
        <details key={deck.id} className="group rounded-2xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="text-lg">
              {deck.emoji}
            </span>
            <span className="flex-1 text-sm font-medium">{deck.title}</span>
            <span className="text-xs text-muted tabular">
              {deck.cards[0]!.n}–{deck.cards.at(-1)!.n}
            </span>
            <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <ol className="flex flex-col gap-2.5 border-t border-border px-4 py-4 text-sm">
            {deck.cards.map((card, index) => (
              <React.Fragment key={card.n}>
                {card.group && card.group !== deck.cards[index - 1]?.group && <li className="pt-2 text-xs font-medium text-muted">{card.group}</li>}
                <li className="flex gap-3">
                  <span className="w-8 shrink-0 text-right text-xs leading-5 text-subtle tabular">{card.n}</span>
                  <span>
                    {card.title && <span className="font-medium">{card.title} — </span>}
                    {card.text}
                  </span>
                </li>
              </React.Fragment>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
