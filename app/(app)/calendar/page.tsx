import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import type { CalendarViewMode } from "@/components/calendar/types";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { startOfDayInstant, todayISO } from "@/lib/dates";
import { requireWorkspace } from "@/server/auth/guards";
import { db, sql } from "@/server/db";
import { listOccurrences, rangeFor } from "@/server/services/calendar";

export const metadata: Metadata = { title: "Calendrier" };

const VIEWS: CalendarViewMode[] = ["month", "week", "agenda"];

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const ctx = await requireWorkspace();
  const params = await searchParams;
  const view = VIEWS.includes(params.view as CalendarViewMode) ? (params.view as CalendarViewMode) : "month";
  const anchor = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const { startDay, endDay } = rangeFor(view, anchor);

  const [occurrences, prefs] = await Promise.all([
    listOccurrences(ctx.workspace.id, startOfDayInstant(startDay), startOfDayInstant(endDay)),
    db.one<{ defaultReminderMinutes: number | null }>(sql`SELECT default_reminder_minutes FROM users WHERE id = ${ctx.user.id}`),
  ]);

  return (
    <PageContainer wide>
      <PageHeader title="Calendrier" description="Rendez-vous, anniversaires, voyages et réservations, au même endroit." className="mb-6 sm:mb-8" />
      <Suspense>
        <CalendarView
          view={view}
          anchor={anchor}
          rangeStart={startDay}
          occurrences={occurrences}
          defaultReminder={prefs.defaultReminderMinutes}
        />
      </Suspense>
    </PageContainer>
  );
}
