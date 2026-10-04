"use client";

import * as React from "react";
import { addDays, formatDay, formatTime, toLocalInput, todayISO } from "@/lib/dates";
import { useMounted } from "@/lib/hooks";
import { cn, ucfirst } from "@/lib/utils";
import { EVENT_STYLES } from "./event-style";
import { EventRow } from "./month-view";
import type { Occurrence } from "./types";
import { groupByDay } from "./utils";

const HOUR = 52;

function minutesOf(date: Date) {
  const { time } = toLocalInput(date);
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

type Placed = { occurrence: Occurrence; top: number; height: number; lane: number; lanes: number };

/** Répartit les événements qui se chevauchent sur plusieurs colonnes. */
function layoutDay(events: Occurrence[], day: string): Placed[] {
  const timed = events
    .filter((e) => !e.allDay)
    .map((occurrence) => {
      const startsToday = toLocalInput(occurrence.occurrenceStart).date === day;
      const start = startsToday ? minutesOf(occurrence.occurrenceStart) : 0;
      const endDate = occurrence.occurrenceEnd;
      const endsToday = endDate ? toLocalInput(endDate).date === day : true;
      const end = endDate ? (endsToday ? minutesOf(endDate) : 24 * 60) : start + 60;
      return { occurrence, start, end: Math.max(end, start + 30) };
    })
    .sort((a, b) => a.start - b.start);

  const placed: Placed[] = [];
  let cluster: (typeof timed[number] & { lane: number })[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const item of cluster) {
      placed.push({ occurrence: item.occurrence, top: (item.start / 60) * HOUR, height: Math.max(((item.end - item.start) / 60) * HOUR, 24), lane: item.lane, lanes });
    }
    cluster = [];
  };
  for (const item of timed) {
    if (item.start >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.end > item.start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ ...item, lane });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return placed;
}

export function WeekView({
  weekStart,
  occurrences,
  onOpen,
  onCreateAt,
}: {
  weekStart: string;
  occurrences: Occurrence[];
  onOpen: (occurrence: Occurrence) => void;
  onCreateAt: (day: string, time: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = React.useMemo(() => groupByDay(occurrences), [occurrences]);
  const today = todayISO();
  const scroller = React.useRef<HTMLDivElement>(null);
  // Heure courante : uniquement côté navigateur (évite tout écart d'hydratation).
  const mounted = useMounted();
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    scroller.current?.scrollTo({ top: HOUR * 7.5 });
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      {/* Mobile : liste par jour */}
      <div className="flex flex-col gap-5 sm:hidden">
        {days.map((day) => {
          const events = byDay.get(day) ?? [];
          return (
            <section key={day}>
              <h3 className={cn("mb-2 text-[13px] font-semibold", day === today && "text-accent")}>{ucfirst(formatDay(day, "full"))}</h3>
              {events.length === 0 ? (
                <p className="text-sm text-subtle">—</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {events.map((event) => (
                    <EventRow key={event.key} event={event} onOpen={() => onOpen(event)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Desktop : grille horaire */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface sm:block">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
          <div />
          {days.map((day) => (
            <div key={day} className="flex flex-col items-center gap-0.5 py-2.5">
              <span className="text-[11px] font-medium text-subtle uppercase">{formatDay(day, "weekdayShort").split(" ")[0]}</span>
              <span
                className={cn(
                  "tabular flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                  day === today && "bg-primary text-primary-foreground",
                )}
              >
                {Number(day.slice(8))}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
          <div className="py-1.5 pr-2 text-right text-[10px] text-subtle">Journée</div>
          {days.map((day) => (
            <div key={day} className="flex min-h-8 flex-col gap-0.5 border-l border-border p-1">
              {(byDay.get(day) ?? [])
                .filter((e) => e.allDay)
                .map((event) => (
                  <button
                    key={event.key}
                    type="button"
                    onClick={() => onOpen(event)}
                    className={cn("truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium", EVENT_STYLES[event.type].chip)}
                  >
                    {event.title}
                  </button>
                ))}
            </div>
          ))}
        </div>

        <div ref={scroller} className="relative h-[620px] overflow-y-auto">
          <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: HOUR * 24 }}>
            <div className="relative">
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[10px] text-subtle" style={{ top: h * HOUR }}>
                  {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                </span>
              ))}
            </div>
            {days.map((day) => (
              <div key={day} className="relative border-l border-border">
                {Array.from({ length: 24 }, (_, h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onCreateAt(day, `${String(h).padStart(2, "0")}:00`)}
                    className="absolute inset-x-0 border-t border-border/70 transition-colors hover:bg-surface-hover/50"
                    style={{ top: h * HOUR, height: HOUR }}
                    aria-label={`Créer un événement le ${formatDay(day, "full")} à ${h} h`}
                  />
                ))}
                {layoutDay(byDay.get(day) ?? [], day).map(({ occurrence, top, height, lane, lanes }) => (
                  <button
                    key={occurrence.key}
                    type="button"
                    onClick={() => onOpen(occurrence)}
                    className={cn(
                      "absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left text-[11.5px] leading-tight shadow-xs transition-[filter] hover:brightness-95",
                      EVENT_STYLES[occurrence.type].chip,
                      EVENT_STYLES[occurrence.type].bar,
                    )}
                    style={{ top: top + 1, height: height - 2, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                  >
                    <span className="block truncate font-semibold">{occurrence.title}</span>
                    {height > 34 && <span className="tabular block truncate opacity-75">{formatTime(occurrence.occurrenceStart)}</span>}
                  </button>
                ))}
                {mounted && day === today && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (minutesOf(now) / 60) * HOUR }}>
                    <span className="-ml-1 size-2 rounded-full bg-accent" />
                    <span className="h-px flex-1 bg-accent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
