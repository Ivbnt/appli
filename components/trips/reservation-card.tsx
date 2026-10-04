"use client";

import { ArrowRight, Copy, ExternalLink, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatTime, toISODay } from "@/lib/dates";
import { RESERVATION_TYPES } from "@/lib/domain";
import { cn, ucfirst } from "@/lib/utils";
import type { Reservation } from "@/server/services/trips";
import { formatPrice, RESERVATION_ICONS } from "./meta";

export function ReservationCard({ reservation, onOpen, showTrip }: { reservation: Reservation; onOpen: () => void; showTrip?: boolean }) {
  const Icon = RESERVATION_ICONS[reservation.type];
  const sameDay = reservation.endsAt && toISODay(reservation.endsAt) === toISODay(reservation.startsAt);
  const price = formatPrice(reservation.price, reservation.currency);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group flex gap-4 rounded-2xl border border-border bg-surface p-4 shadow-xs transition-[border-color,box-shadow] outline-none hover:border-border-strong hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted">
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{reservation.title}</p>
            {reservation.origin && reservation.destination ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                {reservation.origin} <ArrowRight className="size-3.5" /> {reservation.destination}
              </p>
            ) : (
              reservation.location && <p className="mt-0.5 truncate text-sm text-muted">{reservation.location}</p>
            )}
          </div>
          {price && <span className="tabular shrink-0 text-sm font-medium">{price}</span>}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          <span>
            {ucfirst(formatDate(reservation.startsAt, "weekdayShort"))}
            {reservation.hasTime && ` · ${formatTime(reservation.startsAt)}`}
            {reservation.endsAt &&
              (sameDay
                ? reservation.hasTime && ` – ${formatTime(reservation.endsAt)}`
                : ` → ${formatDate(reservation.endsAt, "weekdayShort")}`)}
          </span>
          {reservation.provider && <span>{reservation.provider}</span>}
          {showTrip && reservation.tripTitle && <span className="text-accent">{reservation.tripTitle}</span>}
          {!showTrip && <span className="sr-only">{RESERVATION_TYPES[reservation.type]}</span>}
        </div>
        {(reservation.confirmationNumber || reservation.hasDocument || reservation.url) && (
          <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {reservation.confirmationNumber && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(reservation.confirmationNumber!);
                  toast.success("Référence copiée");
                }}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-surface-muted px-2 font-mono text-xs transition-colors hover:bg-surface-hover"
                aria-label={`Copier la référence ${reservation.confirmationNumber}`}
              >
                {reservation.confirmationNumber}
                <Copy className="size-3 text-subtle" />
              </button>
            )}
            {reservation.hasDocument && (
              <a
                href={`/api/reservations/${reservation.id}/document`}
                target="_blank"
                rel="noreferrer"
                className={cn("inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover")}
              >
                <Paperclip className="size-3.5 text-subtle" /> Billet
              </a>
            )}
            {reservation.url && (
              <a href={reservation.url} target="_blank" rel="noreferrer noopener" className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hover:bg-surface-hover">
                <ExternalLink className="size-3.5 text-subtle" /> Lien
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
