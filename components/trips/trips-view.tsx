"use client";

import { Plane, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { daysUntil, formatDayRange, relativeDay, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TripSummary } from "@/server/services/trips";
import { TripForm } from "./trip-form";

export function tripStatus(trip: Pick<TripSummary, "startDate" | "endDate">) {
  const today = todayISO();
  if (trip.startDate <= today && trip.endDate >= today) return { label: "En cours", tone: "success" as const };
  if (trip.startDate > today) return { label: relativeDay(trip.startDate), tone: "accent" as const };
  return { label: "Terminé", tone: "neutral" as const };
}

function TripCard({ trip, large }: { trip: TripSummary; large?: boolean }) {
  const status = tripStatus(trip);
  return (
    <Link href={`/trips/${trip.id}`} className="group block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className={cn("relative overflow-hidden rounded-3xl bg-surface-muted ring-1 ring-border", large ? "aspect-[16/10] sm:aspect-[21/9]" : "aspect-[4/3]")}>
        {trip.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- couverture privée signée
          <img src={trip.coverUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-surface-muted to-surface-hover">
            <Plane className="size-8 text-subtle" strokeWidth={1.25} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
          <p className="text-xs font-medium tracking-[0.12em] text-white/80 uppercase">{formatDayRange(trip.startDate, trip.endDate)}</p>
          <h3 className={cn("mt-1 font-semibold tracking-tight", large ? "text-3xl sm:text-4xl" : "text-xl")}>{trip.title}</h3>
          <p className="mt-0.5 text-sm text-white/80">{trip.destination}</p>
        </div>
        <Badge tone={status.tone} className="absolute top-4 right-4 bg-surface/90 backdrop-blur">
          {status.label}
        </Badge>
      </div>
    </Link>
  );
}

export function TripsView({ trips }: { trips: TripSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();
  const [creating, setCreating] = React.useState(false);
  const today = todayISO();

  React.useEffect(() => {
    if (searchParams.get("new")) {
      setCreating(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const upcoming = trips.filter((t) => t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = trips.filter((t) => t.endDate < today);

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Nouveau voyage
        </Button>
      </div>
      {trips.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="Aucun voyage pour le moment"
          description="Préparez votre prochain départ : transports, hébergement, restaurants et activités au même endroit."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Planifier un voyage
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-12">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-heading mb-4">À venir</h2>
              <div className="flex flex-col gap-5">
                {upcoming.map((trip, index) => (
                  <motion.div key={trip.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.35 }}>
                    <TripCard trip={trip} large={index === 0} />
                    {index === 0 && daysUntil(trip.startDate) > 0 && (
                      <p className="mt-3 text-sm text-muted">
                        Départ dans <span className="font-semibold text-foreground tabular">{daysUntil(trip.startDate)}</span> jour{daysUntil(trip.startDate) > 1 ? "s" : ""}
                        {trip.reservationCount > 0 && ` · ${trip.reservationCount} réservation${trip.reservationCount > 1 ? "s" : ""}`}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-heading mb-4">Souvenirs de voyage</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      <TripForm open={creating} onOpenChange={setCreating} />
    </>
  );
}
