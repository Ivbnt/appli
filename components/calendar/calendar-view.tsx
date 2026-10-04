"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { addDays, addMonths, formatDay, todayISO } from "@/lib/dates";
import { ucfirst } from "@/lib/utils";
import { AgendaView } from "./agenda-view";
import { EventDetails } from "./event-details";
import { EventEditor, type EventDefaults } from "./event-editor";
import { MonthView } from "./month-view";
import type { CalendarViewMode, Occurrence } from "./types";
import { WeekView } from "./week-view";

function titleFor(view: CalendarViewMode, anchor: string, rangeStart: string) {
  if (view === "month") return formatDay(anchor, "monthYear");
  if (view === "week") {
    const end = addDays(rangeStart, 6);
    return rangeStart.slice(0, 7) === end.slice(0, 7)
      ? `${Number(rangeStart.slice(8))} – ${formatDay(end, "long")}`
      : `${formatDay(rangeStart, "dayMonth")} – ${formatDay(end, "long")}`;
  }
  return `À partir du ${formatDay(anchor, "dayMonth")}`;
}

export function CalendarView({
  view,
  anchor,
  rangeStart,
  occurrences,
  defaultReminder,
}: {
  view: CalendarViewMode;
  anchor: string;
  rangeStart: string;
  occurrences: Occurrence[];
  defaultReminder: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, startNavigation] = React.useTransition();
  const [selectedDay, setSelectedDay] = React.useState(anchor);
  const [details, setDetails] = React.useState<Occurrence | null>(null);
  const [editor, setEditor] = React.useState<{ open: boolean; event: Occurrence | null; defaults: EventDefaults }>({
    open: false,
    event: null,
    defaults: {},
  });

  React.useEffect(() => setSelectedDay(anchor), [anchor]);

  // Ouverture depuis la recherche (?event=…) ou une action rapide (?new=1).
  React.useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId) {
      const found = occurrences.find((o) => o.id === eventId);
      if (found) setDetails(found);
    }
    if (searchParams.get("new")) setEditor({ open: true, event: null, defaults: {} });
    if (eventId || searchParams.get("new")) {
      const params = new URLSearchParams(searchParams);
      params.delete("event");
      params.delete("new");
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    }
  }, [searchParams, occurrences, pathname, router]);

  const navigate = (next: { view?: CalendarViewMode; date?: string }) => {
    const params = new URLSearchParams();
    params.set("view", next.view ?? view);
    params.set("date", next.date ?? anchor);
    startNavigation(() => router.push(`${pathname}?${params}`, { scroll: false }));
  };

  const step = (direction: 1 | -1) => {
    if (view === "month") return navigate({ date: addMonths(anchor, direction) });
    if (view === "week") return navigate({ date: addDays(anchor, 7 * direction) });
    return navigate({ date: addDays(anchor, 30 * direction) });
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" onClick={() => step(-1)} aria-label="Période précédente">
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="icon" onClick={() => step(1)} aria-label="Période suivante">
            <ChevronRight />
          </Button>
        </div>
        <h2 className="text-heading min-w-0 flex-1 truncate sm:flex-none" aria-live="polite">
          {ucfirst(titleFor(view, anchor, rangeStart))}
        </h2>
        {navigating && <Spinner className="text-subtle" />}
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <Button variant="ghost" onClick={() => navigate({ date: todayISO() })}>
            Aujourd&apos;hui
          </Button>
          <Segmented
            label="Vue du calendrier"
            value={view}
            onChange={(v) => navigate({ view: v })}
            options={[
              { value: "month", label: "Mois" },
              { value: "week", label: "Semaine" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
          <Button className="ml-auto sm:ml-0" onClick={() => setEditor({ open: true, event: null, defaults: { day: selectedDay } })}>
            <Plus /> <span className="hidden sm:inline">Événement</span>
          </Button>
        </div>
      </div>

      <div className={navigating ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {view === "month" && (
          <MonthView
            anchor={anchor}
            gridStart={rangeStart}
            occurrences={occurrences}
            selectedDay={selectedDay}
            onSelectDay={(day) => {
              if (window.matchMedia("(min-width: 640px)").matches) setEditor({ open: true, event: null, defaults: { day } });
              else setSelectedDay(day);
            }}
            onOpen={setDetails}
          />
        )}
        {view === "week" && (
          <WeekView
            weekStart={rangeStart}
            occurrences={occurrences}
            onOpen={setDetails}
            onCreateAt={(day, time) => setEditor({ open: true, event: null, defaults: { day, time } })}
          />
        )}
        {view === "agenda" && <AgendaView occurrences={occurrences} startDay={rangeStart} onOpen={setDetails} />}
      </div>

      <EventDetails
        occurrence={details}
        onOpenChange={(open) => !open && setDetails(null)}
        onEdit={() => {
          setEditor({ open: true, event: details, defaults: {} });
          setDetails(null);
        }}
      />
      <EventEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        event={editor.event}
        defaults={editor.defaults}
        defaultReminder={defaultReminder}
      />
    </>
  );
}
