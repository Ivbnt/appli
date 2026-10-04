"use client";

import * as React from "react";
import { addDays, formatDay, formatTime, todayISO } from "@/lib/dates";
import { cn, ucfirst } from "@/lib/utils";
import { EVENT_STYLES } from "./event-style";
import type { Occurrence } from "./types";
import { groupByDay } from "./utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function MonthView({
  anchor,
  gridStart,
  occurrences,
  onSelectDay,
  onOpen,
  selectedDay,
}: {
  anchor: string;
  gridStart: string;
  occurrences: Occurrence[];
  onSelectDay: (day: string) => void;
  onOpen: (occurrence: Occurrence) => void;
  selectedDay: string;
}) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const byDay = React.useMemo(() => groupByDay(occurrences), [occurrences]);
  const today = todayISO();
  const month = anchor.slice(0, 7);
  const selectedEvents = byDay.get(selectedDay) ?? [];

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2.5 text-center text-[11px] font-medium tracking-wide text-subtle uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7" role="grid" aria-label={`Calendrier de ${formatDay(anchor, "monthYear")}`}>
          {days.map((day, index) => {
            const events = byDay.get(day) ?? [];
            const inMonth = day.slice(0, 7) === month;
            const isToday = day === today;
            const isSelected = day === selectedDay;
            return (
              <div
                key={day}
                role="gridcell"
                aria-selected={isSelected}
                className={cn(
                  "group relative flex min-h-[64px] flex-col border-border p-1 text-left sm:min-h-[118px] sm:p-1.5",
                  index % 7 !== 6 && "border-r",
                  index < 35 && "border-b",
                  !inMonth && "bg-surface-muted/40",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className="absolute inset-0 rounded-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  aria-label={`${formatDay(day, "full")}${events.length ? `, ${events.length} événement(s)` : ""}`}
                />
                <span
                  className={cn(
                    "tabular pointer-events-none relative z-[1] mx-auto flex size-7 items-center justify-center rounded-full text-[13px] sm:mx-0",
                    !inMonth && "text-subtle",
                    isToday && "bg-primary font-semibold text-primary-foreground",
                    isSelected && !isToday && "bg-surface-hover font-semibold sm:bg-transparent",
                  )}
                >
                  {Number(day.slice(8))}
                </span>

                {/* Mobile : pastilles */}
                {events.length > 0 && (
                  <span className="pointer-events-none relative z-[1] mt-1 flex justify-center gap-0.5 sm:hidden">
                    {events.slice(0, 3).map((event) => (
                      <span key={event.key} className={cn("size-1.5 rounded-full", EVENT_STYLES[event.type].dot)} />
                    ))}
                  </span>
                )}

                {/* Desktop : intitulés */}
                <div className="relative z-[1] mt-1 hidden flex-col gap-0.5 sm:flex">
                  {events.slice(0, 3).map((event) => (
                    <button
                      key={event.key}
                      type="button"
                      onClick={() => onOpen(event)}
                      className={cn(
                        "flex items-center gap-1.5 truncate rounded-md px-1.5 py-[3px] text-left text-[11.5px] leading-tight font-medium transition-opacity hover:opacity-80",
                        EVENT_STYLES[event.type].chip,
                      )}
                    >
                      {!event.allDay && <span className="tabular shrink-0 opacity-70">{formatTime(event.occurrenceStart)}</span>}
                      <span className="truncate">{event.title}</span>
                    </button>
                  ))}
                  {events.length > 3 && (
                    <button type="button" onClick={() => onSelectDay(day)} className="px-1.5 text-left text-[11px] text-muted hover:text-foreground">
                      +{events.length - 3} autre{events.length - 3 > 1 ? "s" : ""}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile : détail du jour sélectionné */}
      <div className="mt-5 sm:hidden">
        <h3 className="mb-2 text-[13px] font-semibold">{ucfirst(formatDay(selectedDay, "full"))}</h3>
        {selectedEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong/70 px-4 py-6 text-center text-sm text-muted">Rien de prévu ce jour-là.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedEvents.map((event) => (
              <li key={event.key}>
                <EventRow event={event} onOpen={() => onOpen(event)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function EventRow({ event, onOpen }: { event: Occurrence; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-l-[3px] border-border bg-surface px-3.5 py-3 text-left shadow-xs transition-colors hover:border-border-strong",
        EVENT_STYLES[event.type].bar,
      )}
    >
      <span className="tabular w-12 shrink-0 text-xs text-muted">{event.allDay ? "Journée" : formatTime(event.occurrenceStart)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{event.title}</span>
        {event.location && <span className="block truncate text-xs text-muted">{event.location}</span>}
      </span>
    </button>
  );
}
