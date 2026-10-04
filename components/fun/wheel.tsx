"use client";

import { Check, RotateCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markActivityDoneAction } from "@/server/actions/fun";
import type { Activity } from "@/server/services/fun";
import { ActivityPoolEditor } from "./activity-pool";

const SIZE = 340;
const R = SIZE / 2;

function polar(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: R + radius * Math.cos(rad), y: R + radius * Math.sin(rad) };
}

function segmentPath(start: number, end: number) {
  const a = polar(start, R - 2);
  const b = polar(end, R - 2);
  const large = end - start > 180 ? 1 : 0;
  return `M ${R} ${R} L ${a.x} ${a.y} A ${R - 2} ${R - 2} 0 ${large} 1 ${b.x} ${b.y} Z`;
}

/** Roue des activités : rotation fluide qui ralentit naturellement. */
export function Wheel({ initialActivities }: { initialActivities: Activity[] }) {
  const reduce = useReducedMotion();
  const [activities, setActivities] = React.useState(initialActivities);
  const [rotation, setRotation] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [result, setResult] = React.useState<Activity | null>(null);
  const segment = activities.length ? 360 / activities.length : 360;

  const spin = () => {
    if (activities.length < 2 || spinning) return;
    const index = Math.floor(Math.random() * activities.length);
    const center = index * segment + segment / 2 + (Math.random() - 0.5) * segment * 0.6;
    const current = ((rotation % 360) + 360) % 360;
    const target = rotation + (reduce ? 0 : 6 * 360) + ((((360 - center - current) % 360) + 360) % 360);
    setResult(null);
    setSpinning(true);
    setRotation(target);
    window.setTimeout(
      () => {
        setSpinning(false);
        setResult(activities[index]!);
      },
      reduce ? 50 : 4600,
    );
  };

  const confirmDone = async () => {
    if (!result) return;
    const response = await markActivityDoneAction({ id: result.id });
    if (!response.ok) return void toast.error(response.error);
    setActivities((list) => list.map((a) => (a.id === result.id ? response.data.activity : a)));
    toast.success("C'est noté !", { description: response.data.badges.length ? `Nouveau badge : ${response.data.badges.map((b) => b.name).join(", ")}` : undefined });
    setResult(null);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-10">
      <div className="relative" style={{ width: "min(100%, 340px)" }}>
        <svg viewBox="0 0 24 24" className="absolute -top-3 left-1/2 z-10 size-7 -translate-x-1/2 drop-shadow-md" aria-hidden="true">
          <path d="M12 22 4 6h16z" className="fill-foreground" />
        </svg>
        <motion.svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full rounded-full shadow-lg ring-1 ring-border"
          animate={{ rotate: rotation }}
          transition={reduce ? { duration: 0 } : { duration: 4.5, ease: [0.12, 0.8, 0.18, 1] }}
          role="img"
          aria-label={`Roue avec ${activities.length} activités`}
        >
          <circle cx={R} cy={R} r={R} className="fill-surface" />
          {activities.map((activity, i) => {
            const start = i * segment;
            const mid = start + segment / 2;
            const label = polar(mid, R * 0.62);
            return (
              <g key={activity.id}>
                <path d={segmentPath(start, start + segment)} className={i % 2 ? "fill-surface-muted" : "fill-surface"} />
                <line x1={R} y1={R} x2={polar(start, R).x} y2={polar(start, R).y} className="stroke-border" strokeWidth={1} />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  // Les libellés de la moitié gauche sont retournés pour rester lisibles.
                  transform={`rotate(${mid > 180 ? mid + 90 : mid - 90} ${label.x} ${label.y})`}
                  className="fill-foreground text-[12px] font-medium"
                >
                  {activity.label.length > 16 ? `${activity.label.slice(0, 15)}…` : activity.label}
                </text>
              </g>
            );
          })}
          {activities.length === 1 && <circle cx={R} cy={R} r={R - 2} className="fill-surface-muted" />}
          <circle cx={R} cy={R} r={R - 1} fill="none" className="stroke-border-strong" strokeWidth={2} />
        </motion.svg>
        <button
          type="button"
          onClick={spin}
          disabled={spinning || activities.length < 2}
          className="absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg ring-4 ring-surface transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          aria-label="Faire tourner la roue"
        >
          {spinning ? <RotateCw className="size-5 animate-spin" /> : "Tourner"}
        </button>
      </div>

      <div className="flex min-h-[88px] flex-col items-center gap-3 text-center" aria-live="polite">
        {result ? (
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
            <p className="text-display">{result.label}</p>
            <Button variant="secondary" onClick={confirmDone}>
              <Check /> On fait ça !
            </Button>
          </motion.div>
        ) : (
          <p className="text-sm text-muted">{activities.length < 2 ? "Ajoutez au moins deux activités." : spinning ? "La roue tourne…" : "Faites tourner la roue."}</p>
        )}
      </div>

      <section className="w-full">
        <h3 className="text-heading mb-1">Activités de la roue</h3>
        <p className="mb-4 text-sm text-muted">Personnalisez les cases de la roue.</p>
        <ActivityPoolEditor activities={activities} pool="wheel" onChange={setActivities} />
      </section>
    </div>
  );
}
