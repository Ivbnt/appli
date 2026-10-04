"use client";

import { ArrowRight, CalendarDays, CheckSquare, Clapperboard, Images, MapPin, Plane, Shuffle, Ticket } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { toast } from "sonner";
import { TaskCheckbox } from "@/components/tasks/task-card";
import { MoviePoster } from "@/components/movies/movie-poster";
import { RESERVATION_ICONS } from "@/components/trips/meta";
import { daysUntil, formatDate, formatDay, formatDayRange, formatTime, relativeDay, toISODay, todayISO } from "@/lib/dates";
import type { ReservationType } from "@/lib/domain";
import { useOnChange } from "@/lib/hooks";
import { cn, formatDuration, ucfirst } from "@/lib/utils";
import { setTaskDoneAction } from "@/server/actions/tasks";
import type { Dashboard } from "@/server/services/dashboard";

function Tile({ className, children, index = 0 }: { className?: string; children: React.ReactNode; index?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.04 * index, ease: [0.22, 1, 0.36, 1] }}
      className={cn("rounded-3xl border border-border bg-surface shadow-xs", className)}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
      <Icon className="size-3.5" />
      {children}
    </p>
  );
}

function EmptyLine({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group mt-3 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
      {children} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function whenLabel(date: Date, hasTime: boolean) {
  const day = toISODay(date);
  const relative = Math.abs(daysUntil(day)) <= 6 ? relativeDay(day) : ucfirst(formatDay(day, "full"));
  return hasTime ? `${relative} · ${formatTime(date)}` : relative;
}

export function DashboardView({ data, greeting, name, togetherSince }: { data: Dashboard; greeting: string; name: string; togetherSince: string | null }) {
  const task = data.task;
  const [taskDone, setTaskDone] = React.useState(false);
  useOnChange(data.task?.id, () => setTaskDone(false));

  const together = togetherSince ? -daysUntil(togetherSince) : null;
  const trip = data.trip;
  const tripDays = trip ? daysUntil(trip.startDate) : null;
  const ReservationIcon = data.reservation ? RESERVATION_ICONS[data.reservation.type as ReservationType] ?? Ticket : Ticket;

  const completeTask = async () => {
    if (!task) return;
    setTaskDone(true);
    const result = await setTaskDoneAction({ id: task.id, done: true });
    if (!result.ok) {
      setTaskDone(false);
      toast.error(result.error);
    } else toast.success("Tâche terminée");
  };

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <header>
        <h1 className="text-display">
          {greeting}, {name}
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          {ucfirst(formatDay(todayISO(), "full"))}
          {together !== null && together > 0 && (
            <>
              {" · "}ensemble depuis <span className="tabular font-medium text-foreground">{together.toLocaleString("fr-FR")}</span> jours
            </>
          )}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Prochain voyage */}
        <Tile index={0} className="overflow-hidden lg:col-span-2">
          {trip ? (
            <Link href={`/trips/${trip.id}`} className="group relative block h-full min-h-[260px] sm:min-h-[300px]">
              {trip.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- couverture privée signée
                <img src={trip.coverUrl} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-surface-muted to-surface-hover" />
              )}
              <div className={cn("absolute inset-0", trip.coverUrl ? "bg-gradient-to-t from-black/70 via-black/10 to-transparent" : "")} />
              <div className={cn("absolute inset-x-0 bottom-0 p-6 sm:p-8", trip.coverUrl ? "text-white" : "")}>
                <p className={cn("flex items-center gap-1.5 text-xs font-medium", trip.coverUrl ? "text-white/80" : "text-muted")}>
                  <Plane className="size-3.5" /> Prochain voyage
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{trip.title}</p>
                <p className={cn("mt-2 text-sm", trip.coverUrl ? "text-white/85" : "text-muted")}>
                  {tripDays !== null && tripDays > 0 ? (
                    <>
                      Dans <span className="tabular font-semibold">{tripDays}</span> jour{tripDays > 1 ? "s" : ""}
                    </>
                  ) : (
                    "En ce moment"
                  )}
                  {" · "}
                  {formatDayRange(trip.startDate, trip.endDate)}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex h-full min-h-[220px] flex-col justify-end p-6 sm:p-8">
              <Eyebrow icon={Plane}>Prochain voyage</Eyebrow>
              <p className="mt-2 text-2xl font-semibold tracking-tight">Aucun départ prévu</p>
              <EmptyLine href="/trips?new=1">Planifier un voyage</EmptyLine>
            </div>
          )}
        </Tile>

        {/* Aujourd'hui */}
        <Tile index={1} className="flex flex-col p-6">
          <h2 className="text-heading">Aujourd&apos;hui</h2>
          <p className="text-sm text-muted">
            {data.todayCount === 0 ? "Rien de prévu, profitez-en." : `${data.todayCount} événement${data.todayCount > 1 ? "s" : ""} aujourd'hui.`}
          </p>
          <div className="mt-6 flex flex-1 flex-col gap-5">
            <div>
              <Eyebrow icon={CalendarDays}>Prochain événement</Eyebrow>
              {data.nextEvent ? (
                <Link href={`/calendar?event=${data.nextEvent.id}`} className="mt-1.5 block rounded-lg transition-opacity hover:opacity-80">
                  <p className="font-semibold">{data.nextEvent.title}</p>
                  <p className="text-sm text-muted">{whenLabel(data.nextEvent.occurrenceStart, !data.nextEvent.allDay)}</p>
                </Link>
              ) : (
                <EmptyLine href="/calendar?new=1">Ajouter un événement</EmptyLine>
              )}
            </div>
            <div className="h-px bg-border" />
            <div>
              <Eyebrow icon={Ticket}>Prochaine réservation</Eyebrow>
              {data.reservation ? (
                <Link href={`/trips/reservations?reservation=${data.reservation.id}`} className="mt-1.5 flex items-start gap-3 rounded-lg transition-opacity hover:opacity-80">
                  <ReservationIcon className="mt-0.5 size-4 shrink-0 text-subtle" />
                  <span>
                    <span className="block font-semibold">{data.reservation.title}</span>
                    <span className="block text-sm text-muted">{whenLabel(data.reservation.startsAt, data.reservation.hasTime)}</span>
                  </span>
                </Link>
              ) : (
                <EmptyLine href="/trips/reservations">Ajouter une réservation</EmptyLine>
              )}
            </div>
          </div>
        </Tile>

        {/* À faire */}
        <Tile index={2} className="p-6">
          <div className="flex items-center justify-between">
            <Eyebrow icon={CheckSquare}>À faire</Eyebrow>
            {data.counts.openTasks > 1 && (
              <Link href="/tasks" className="text-xs text-muted hover:text-foreground">
                {data.counts.openTasks} tâches
              </Link>
            )}
          </div>
          {task ? (
            <div className="mt-3 flex items-start gap-3">
              <span className="pt-1">
                <TaskCheckbox checked={taskDone} onChange={(v) => v && completeTask()} label="Marquer comme terminée" />
              </span>
              <Link href={`/tasks?task=${task.id}`} className="min-w-0">
                <p className={cn("text-lg leading-snug font-semibold tracking-tight transition-colors", taskDone && "text-subtle line-through")}>{task.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {[task.categoryName, task.dueDate ? `Échéance : ${relativeDay(task.dueDate).toLowerCase()}` : null].filter(Boolean).join(" · ") || "Sans échéance"}
                </p>
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-3 text-lg font-semibold tracking-tight">Tout est fait.</p>
              <EmptyLine href="/tasks?new=1">Ajouter une tâche</EmptyLine>
            </>
          )}
        </Tile>

        {/* Ce soir */}
        <Tile index={3} className="p-6 lg:col-span-2">
          <div className="grid h-full gap-6 sm:grid-cols-2">
            <div className="flex gap-4">
              {data.movie ? (
                <>
                  <MoviePoster url={data.movie.posterUrl} title={data.movie.title} className="w-20 shrink-0 rounded-lg" />
                  <div className="min-w-0">
                    <Eyebrow icon={Clapperboard}>Ce soir, un film ?</Eyebrow>
                    <Link href={`/movies?movie=${data.movie.id}`} className="mt-1.5 block hover:opacity-80">
                      <p className="text-lg leading-snug font-semibold tracking-tight">{data.movie.title}</p>
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      {[data.movie.year, data.movie.runtime ? formatDuration(data.movie.runtime) : null, data.movie.genres[0]].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <Eyebrow icon={Clapperboard}>Ce soir, un film ?</Eyebrow>
                  <p className="mt-1.5 text-lg font-semibold tracking-tight">Votre liste est vide</p>
                  <EmptyLine href="/movies?new=1">Ajouter un film</EmptyLine>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-between border-t border-border pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
              <div>
                <Eyebrow icon={Shuffle}>Activité suggérée</Eyebrow>
                <p className="mt-1.5 text-lg font-semibold tracking-tight">{data.activity?.label ?? "Une soirée improvisée"}</p>
              </div>
              <EmptyLine href="/fun/tonight">Tirer au sort autre chose</EmptyLine>
            </div>
          </div>
        </Tile>

        {/* Dernier souvenir */}
        <Tile index={4} className="overflow-hidden lg:col-span-3">
          {data.photo ? (
            <Link href={`/memories?photo=${data.photo.id}`} className="group relative block">
              {/* eslint-disable-next-line @next/next/no-img-element -- photo privée signée */}
              <img
                src={data.photo.url}
                alt={data.photo.description ?? "Dernier souvenir"}
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01] sm:aspect-[21/9]"
                style={{ backgroundColor: data.photo.dominantColor ?? undefined }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                  <Images className="size-3.5" /> Dernier souvenir
                </p>
                <p className="mt-1.5 text-xl font-semibold tracking-tight">
                  {data.photo.description ?? ucfirst(formatDate(data.photo.takenAt ?? data.photo.createdAt, "long"))}
                </p>
                {data.photo.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-white/80">
                    <MapPin className="size-3.5" /> {data.photo.location}
                  </p>
                )}
              </div>
            </Link>
          ) : (
            <div className="flex flex-col items-start p-6 sm:p-8">
              <Eyebrow icon={Images}>Dernier souvenir</Eyebrow>
              <p className="mt-2 text-2xl font-semibold tracking-tight">Vos photos apparaîtront ici</p>
              <EmptyLine href="/memories?upload=1">Importer des photos</EmptyLine>
            </div>
          )}
        </Tile>
      </div>
    </div>
  );
}
