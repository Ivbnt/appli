"use client";

import { Bell, CalendarDays, Clock, Link2, MapPin, Repeat } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { formatDate, formatDay, formatTime, toISODay } from "@/lib/dates";
import { EVENT_TYPES, REMINDER_OPTIONS } from "@/lib/domain";
import { ucfirst } from "@/lib/utils";
import { EVENT_STYLES } from "./event-style";
import type { Occurrence } from "./types";

function Row({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-subtle" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EventDetails({
  occurrence,
  onOpenChange,
  onEdit,
}: {
  occurrence: Occurrence | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  const event = occurrence;
  const linked = event?.reservationId || event?.tripId;
  const startDay = event ? toISODay(event.occurrenceStart) : "";
  const endDay = event?.occurrenceEnd ? toISODay(event.allDay ? event.occurrenceEnd : new Date(event.occurrenceEnd.getTime() - 1)) : null;

  return (
    <Drawer
      open={event !== null}
      onOpenChange={onOpenChange}
      title={event?.title ?? ""}
      footer={
        event &&
        (linked ? (
          <Link
            href={event.tripId ? `/trips/${event.tripId}` : `/trips/reservations?reservation=${event.reservationId}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            <Link2 /> {event.tripId ? "Voir le voyage" : "Voir la réservation"}
          </Link>
        ) : (
          <Button onClick={onEdit}>Modifier</Button>
        ))
      }
    >
      {event && (
        <div>
          <Badge tone="neutral" className="mb-3">
            <span className={`size-1.5 rounded-full ${EVENT_STYLES[event.type].dot}`} />
            {EVENT_TYPES[event.type]}
          </Badge>
          <div className="divide-y divide-border">
            <Row icon={CalendarDays}>
              <span>{ucfirst(formatDay(startDay, "full"))}</span>
              {endDay && endDay !== startDay && (
                <>
                  {" "}→ <span>{formatDay(endDay, "full")}</span>
                </>
              )}
            </Row>
            {!event.allDay && (
              <Row icon={Clock}>
                {formatTime(event.occurrenceStart)}
                {event.occurrenceEnd && ` – ${formatTime(event.occurrenceEnd)}`}
              </Row>
            )}
            {event.location && (
              <Row icon={MapPin}>
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {event.location}
                </a>
              </Row>
            )}
            {event.recurrence === "yearly" && (
              <Row icon={Repeat}>Chaque année depuis le {formatDate(event.startDate, "long")}</Row>
            )}
            <Row icon={Bell}>
              {REMINDER_OPTIONS.find((o) => o.value === event.reminderMinutes)?.label ??
                (event.reminderMinutes === null ? "Aucun rappel" : `${event.reminderMinutes} min avant`)}
            </Row>
          </div>
          {event.description && <p className="mt-4 text-sm whitespace-pre-line text-muted">{event.description}</p>}
          {linked && (
            <p className="mt-4 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-muted">
              Cet événement est géré automatiquement depuis {event.tripId ? "le voyage" : "la réservation"} associé{event.tripId ? "" : "e"}.
            </p>
          )}
        </div>
      )}
    </Drawer>
  );
}
