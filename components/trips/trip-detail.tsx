"use client";

import { MapPin, Pencil, Plane, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PhotoStrip } from "@/components/photos/photo-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayRange } from "@/lib/dates";
import { PLACE_CATEGORIES, TRIP_SECTIONS, type PlaceCategory, type ReservationType } from "@/lib/domain";
import type { Reservation, TripSummary } from "@/server/services/trips";
import { ReservationCard } from "./reservation-card";
import { ReservationForm } from "./reservation-form";
import { TripForm } from "./trip-form";
import { tripStatus } from "./trips-view";

type TripPlace = { id: string; name: string; category: PlaceCategory; status: "visited" | "want_to_visit" };

export function TripDetail({
  trip,
  reservations,
  places,
  trips,
}: {
  trip: TripSummary;
  reservations: Reservation[];
  places: TripPlace[];
  trips: { id: string; title: string; startDate: string }[];
}) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<{ open: boolean; reservation: Reservation | null; type?: ReservationType }>({ open: false, reservation: null });
  const status = tripStatus(trip);

  return (
    <>
      <div className="relative -mx-4 mb-10 overflow-hidden sm:mx-0 sm:rounded-3xl">
        <div className="relative aspect-[4/3] bg-surface-muted sm:aspect-[21/9]">
          {trip.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- couverture privée signée
            <img src={trip.coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-surface-muted to-surface-hover">
              <Plane className="size-10 text-subtle" strokeWidth={1.25} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-end sm:justify-between sm:p-8">
            <div>
              <Badge tone={status.tone} className="mb-3 bg-surface/90">
                {status.label}
              </Badge>
              <h1 className="text-4xl font-semibold tracking-[-0.03em] uppercase sm:text-6xl">{trip.title}</h1>
              <p className="mt-2 text-sm font-medium tracking-[0.12em] text-white/85 uppercase">{formatDayRange(trip.startDate, trip.endDate)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
                <MapPin className="size-3.5" /> {trip.destination}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)} className="border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/25">
                <Pencil /> Modifier
              </Button>
              <Button onClick={() => setForm({ open: true, reservation: null })} className="bg-white text-black hover:bg-white/90">
                <Plus /> Réservation
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-9">
          {trip.description && <p className="max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-muted">{trip.description}</p>}
          {TRIP_SECTIONS.map((section) => {
            const items = reservations.filter((r) => section.types.includes(r.type));
            const restaurantsPlaces = section.key === "restaurant" ? places.filter((p) => p.category === "restaurant") : [];
            const activityPlaces = section.key === "activity" ? places.filter((p) => p.category === "activity") : [];
            const linkedPlaces = [...restaurantsPlaces, ...activityPlaces];
            if (items.length === 0 && linkedPlaces.length === 0 && section.key === "other") return null;
            return (
              <section key={section.key} aria-labelledby={`section-${section.key}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 id={`section-${section.key}`} className="text-eyebrow tracking-[0.1em] uppercase">
                    {section.label}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, reservation: null, type: section.types[0] })}>
                    <Plus /> Ajouter
                  </Button>
                </div>
                {items.length === 0 && linkedPlaces.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border-strong/70 px-4 py-5 text-sm text-subtle">Rien de prévu pour l&apos;instant.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {items.map((reservation) => (
                      <ReservationCard key={reservation.id} reservation={reservation} onOpen={() => setForm({ open: true, reservation })} />
                    ))}
                    {linkedPlaces.map((place) => (
                      <Link
                        key={place.id}
                        href={`/map?place=${place.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong/70 px-4 py-3 text-sm transition-colors hover:bg-surface-hover/60"
                      >
                        <MapPin className="size-4 text-subtle" />
                        <span className="flex-1 font-medium">{place.name}</span>
                        <span className="text-xs text-muted">{place.status === "visited" ? "Visité" : `${PLACE_CATEGORIES[place.category]} à tester`}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <aside className="flex flex-col gap-8">
          <PhotoStrip links={{ tripId: trip.id }} title="Photos du voyage" />
          {places.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold">Lieux</h3>
              <ul className="flex flex-col gap-1">
                {places.map((place) => (
                  <li key={place.id}>
                    <Link href={`/map?place=${place.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-hover">
                      <span className={place.status === "visited" ? "size-2 rounded-full bg-primary" : "size-2 rounded-full border border-accent"} />
                      {place.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <TripForm open={editing} onOpenChange={setEditing} trip={trip} />
      <ReservationForm
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        reservation={form.reservation}
        trips={trips}
        defaults={{ tripId: trip.id, ...(form.type ? { type: form.type } : {}) }}
      />
    </>
  );
}
