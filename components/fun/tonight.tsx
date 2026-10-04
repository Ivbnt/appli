"use client";

import { Check, Shuffle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markActivityDoneAction } from "@/server/actions/fun";
import type { Activity } from "@/server/services/fun";
import { ActivityPoolEditor } from "./activity-pool";

/** « Ce soir, on fait… » : tirage au sort avec un défilement façon machine à sous. */
export function Tonight({ initialActivities }: { initialActivities: Activity[] }) {
  const reduce = useReducedMotion();
  const [activities, setActivities] = React.useState(initialActivities);
  const [display, setDisplay] = React.useState<Activity | null>(null);
  const [result, setResult] = React.useState<Activity | null>(null);
  const [spinning, setSpinning] = React.useState(false);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const draw = () => {
    if (activities.length === 0 || spinning) return;
    const winner = activities[Math.floor(Math.random() * activities.length)]!;
    setResult(null);
    if (reduce) {
      setDisplay(winner);
      setResult(winner);
      return;
    }
    setSpinning(true);
    let elapsed = 0;
    let step = 0;
    const delays = Array.from({ length: 16 }, (_, i) => 40 + i * i * 1.1);
    for (const delay of delays) {
      elapsed += delay;
      const index = step++;
      timers.current.push(window.setTimeout(() => setDisplay(activities[(index + Math.floor(Math.random() * activities.length)) % activities.length]!), elapsed));
    }
    timers.current.push(
      window.setTimeout(() => {
        setDisplay(winner);
        setResult(winner);
        setSpinning(false);
      }, elapsed + 220),
    );
  };

  const confirmDone = async () => {
    if (!result) return;
    const response = await markActivityDoneAction({ id: result.id });
    if (!response.ok) return void toast.error(response.error);
    setActivities((list) => list.map((a) => (a.id === result.id ? response.data.activity : a)));
    toast.success("Bonne soirée !", { description: response.data.badges.length ? `Nouveau badge : ${response.data.badges.map((b) => b.name).join(", ")}` : undefined });
    setResult(null);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-12 text-center shadow-sm sm:py-16">
        <p className="text-eyebrow tracking-[0.12em] uppercase">Ce soir, on fait…</p>
        <div className="mt-6 flex h-20 items-center justify-center" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={display?.id ?? "empty"}
              initial={reduce ? false : { y: 24, opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { y: -24, opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: spinning ? 0.08 : 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="text-display"
            >
              {display?.label ?? "?"}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button size="lg" onClick={draw} disabled={spinning || activities.length === 0}>
            <Shuffle /> {result ? "Relancer" : "Tirer au sort"}
          </Button>
          {result && !spinning && (
            <motion.div initial={reduce ? false : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Button size="lg" variant="secondary" onClick={confirmDone}>
                <Check /> On fait ça !
              </Button>
            </motion.div>
          )}
        </div>
        {activities.length === 0 && <p className="mt-4 text-sm text-muted">Ajoutez quelques idées ci-dessous pour commencer.</p>}
      </section>

      <section>
        <h3 className="text-heading mb-1">Vos idées</h3>
        <p className="mb-4 text-sm text-muted">Le tirage se fait parmi cette liste.</p>
        <ActivityPoolEditor activities={activities} pool="tonight" onChange={setActivities} />
      </section>
    </div>
  );
}
