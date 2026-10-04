"use client";

import { CalendarDays } from "lucide-react";
import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDay, relativeDay, todayISO } from "@/lib/dates";
import { cn, ucfirst } from "@/lib/utils";
import { EventRow } from "./month-view";
import type { Occurrence } from "./types";
import { groupByDay } from "./utils";

export function AgendaView({ occurrences, startDay, onOpen }: { occurrences: Occurrence[]; startDay: string; onOpen: (o: Occurrence) => void }) {
  const byDay = React.useMemo(() => groupByDay(occurrences), [occurrences]);
  const days = [...byDay.keys()].filter((day) => day >= startDay).sort();
  const today = todayISO();

  if (days.length === 0) {
    return <EmptyState icon={CalendarDays} title="Rien de prévu" description="Aucun événement dans les 60 prochains jours. Profitez-en pour planifier quelque chose." />;
  }

  return (
    <div className="flex flex-col gap-7">
      {days.map((day) => (
        <section key={day} className="grid gap-3 sm:grid-cols-[180px_1fr] sm:gap-6">
          <header className="sm:pt-3">
            <p className={cn("text-sm font-semibold", day === today && "text-accent")}>{ucfirst(formatDay(day, "full"))}</p>
            <p className="text-xs text-muted">{relativeDay(day)}</p>
          </header>
          <div className="flex flex-col gap-2">
            {byDay.get(day)!.map((event) => (
              <EventRow key={event.key} event={event} onOpen={() => onOpen(event)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
