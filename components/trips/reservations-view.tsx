"use client";

import { Plus, Ticket } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { useSearchParamIntent } from "@/lib/hooks";
import { ucfirst } from "@/lib/utils";
import { formatDate, toISODay, todayISO } from "@/lib/dates";
import type { Reservation } from "@/server/services/trips";
import { ReservationCard } from "./reservation-card";
import { ReservationForm } from "./reservation-form";

export function ReservationsView({ reservations, trips }: { reservations: Reservation[]; trips: { id: string; title: string; startDate: string }[] }) {
  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");
  const [form, setForm] = React.useState<{ open: boolean; reservation: Reservation | null }>({ open: false, reservation: null });
  const today = todayISO();

  useSearchParamIntent(["reservation"], (params) => {
    const found = reservations.find((r) => r.id === params.get("reservation"));
    if (found) setForm({ open: true, reservation: found });
  });

  const upcoming = reservations.filter((r) => toISODay(r.endsAt ?? r.startsAt) >= today);
  const past = reservations.filter((r) => toISODay(r.endsAt ?? r.startsAt) < today).reverse();
  const list = tab === "upcoming" ? upcoming : past;

  const groups = new Map<string, Reservation[]>();
  for (const reservation of list) {
    const key = ucfirst(formatDate(reservation.startsAt, "monthYear"));
    groups.set(key, [...(groups.get(key) ?? []), reservation]);
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Segmented
          label="Période"
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: "À venir", count: upcoming.length },
            { value: "past", label: "Passées", count: past.length },
          ]}
        />
        <Button onClick={() => setForm({ open: true, reservation: null })}>
          <Plus /> <span className="hidden sm:inline">Réservation</span>
        </Button>
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={tab === "upcoming" ? "Aucune réservation à venir" : "Aucune réservation passée"}
          description="Billets de train, vols, hôtels, restaurants, concerts : gardez tout au même endroit, avec les documents."
          action={
            <Button onClick={() => setForm({ open: true, reservation: null })}>
              <Plus /> Ajouter une réservation
            </Button>
          }
        />
      ) : (
        <div className="flex max-w-3xl flex-col gap-8">
          {[...groups.entries()].map(([month, items]) => (
            <section key={month}>
              <h2 className="text-heading mb-3">{month}</h2>
              <div className="flex flex-col gap-2.5">
                {items.map((reservation) => (
                  <ReservationCard key={reservation.id} reservation={reservation} showTrip onOpen={() => setForm({ open: true, reservation })} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <ReservationForm open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} reservation={form.reservation} trips={trips} />
    </>
  );
}
