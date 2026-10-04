"use client";

import { Flag, Pencil, Plane, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatDay, formatDayRange, todayISO } from "@/lib/dates";
import { useOnChange } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { createMilestoneAction, deleteMilestoneAction, updateMilestoneAction } from "@/server/actions/photos";
import type { Milestone, Photo } from "./types";

export type TimelineTrip = { id: string; title: string; destination: string; startDate: string; endDate: string; coverUrl: string | null };

type Entry =
  | { kind: "milestone"; date: string; milestone: Milestone }
  | { kind: "trip"; date: string; trip: TimelineTrip }
  | { kind: "together"; date: string };

function MilestoneForm({
  open,
  onOpenChange,
  milestone,
  photos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: Milestone | null;
  photos: Photo[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState<string | null>(todayISO());
  const [photoId, setPhotoId] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = React.useTransition();

  useOnChange(open ? milestone ?? "new" : null, (key) => {
    if (key === null) return;
    setTitle(milestone?.title ?? "");
    setDescription(milestone?.description ?? "");
    setDate(milestone?.date ?? todayISO());
    setPhotoId(milestone?.photoId ?? null);
    setErrors({});
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = { title, description: description || null, date: date ?? "", photoId };
      const result = milestone ? await updateMilestoneAction({ id: milestone.id, ...payload }) : await createMilestoneAction(payload);
      if (!result.ok) return setErrors(result.fieldErrors ?? { title: [result.error] });
      onOpenChange(false);
      toast.success(milestone ? "Moment mis à jour" : "Moment ajouté");
      router.refresh();
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={milestone ? "Modifier le moment" : "Nouveau moment"}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="milestone-form" loading={pending}>
            {milestone ? "Enregistrer" : "Ajouter"}
          </Button>
        </>
      }
    >
      <form id="milestone-form" onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={errors._?.[0]} />
        <Field label="Titre" htmlFor="milestone-title" error={errors.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Première rencontre" autoFocus maxLength={160} />
        </Field>
        <Field label="Date" htmlFor="milestone-date" error={errors.date}>
          <DatePicker value={date} onChange={setDate} clearable={false} />
        </Field>
        <Field label="Récit" htmlFor="milestone-description" optional>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Ce dont vous voulez vous souvenir…" />
        </Field>
        {photos.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">
              Photo <span className="font-normal text-subtle">facultatif</span>
            </legend>
            <div className="grid max-h-56 grid-cols-5 gap-1 overflow-y-auto rounded-xl sm:grid-cols-6">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setPhotoId(photoId === photo.id ? null : photo.id)}
                  aria-pressed={photoId === photo.id}
                  className={cn("relative aspect-square overflow-hidden rounded-md transition-all", photoId === photo.id ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "opacity-80 hover:opacity-100")}
                  style={{ backgroundColor: photo.dominantColor ?? undefined }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniature privée signée */}
                  <img src={photo.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </form>
    </Modal>
  );
}

export function TimelineView({
  milestones,
  trips,
  togetherSince,
  photos,
}: {
  milestones: Milestone[];
  trips: TimelineTrip[];
  togetherSince: string | null;
  photos: Photo[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const reduce = useReducedMotion();
  const [form, setForm] = React.useState<{ open: boolean; milestone: Milestone | null }>({ open: false, milestone: null });

  const entries: Entry[] = [
    ...milestones.map((milestone) => ({ kind: "milestone" as const, date: milestone.date, milestone })),
    ...trips.map((trip) => ({ kind: "trip" as const, date: trip.startDate, trip })),
    ...(togetherSince ? [{ kind: "together" as const, date: togetherSince }] : []),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const years = [...new Set(entries.map((e) => e.date.slice(0, 4)))];

  const remove = async (milestone: Milestone) => {
    if (!(await confirm({ title: "Supprimer ce moment ?", description: `« ${milestone.title} »`, confirmLabel: "Supprimer", destructive: true }))) return;
    const result = await deleteMilestoneAction({ id: milestone.id });
    if (!result.ok) return void toast.error(result.error);
    router.refresh();
  };

  return (
    <>
      <div className="mb-8 flex justify-end">
        <Button onClick={() => setForm({ open: true, milestone: null })}>
          <Plus /> Nouveau moment
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Votre histoire commence ici"
          description="Ajoutez les moments importants : une première rencontre, un premier voyage, un emménagement…"
          action={
            <Button onClick={() => setForm({ open: true, milestone: null })}>
              <Plus /> Ajouter un moment
            </Button>
          }
        />
      ) : (
        <div className="mx-auto max-w-3xl">
          {years.map((year) => (
            <section key={year} className="relative grid grid-cols-[56px_1fr] gap-x-5 pb-10 sm:grid-cols-[88px_1fr] sm:gap-x-8" aria-label={year}>
              <h2 className="tabular sticky top-16 self-start text-2xl font-semibold tracking-tight text-subtle sm:text-[28px] md:top-4">{year}</h2>
              <ol className="relative flex flex-col gap-8 border-l border-border pl-6 sm:pl-8">
                {entries
                  .filter((e) => e.date.startsWith(year))
                  .map((entry, index) => (
                    <motion.li
                      key={entry.kind === "milestone" ? entry.milestone.id : entry.kind === "trip" ? entry.trip.id : "together"}
                      initial={reduce ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
                      className="relative"
                    >
                      <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-surface bg-foreground ring-4 ring-surface sm:-left-[37px]" aria-hidden="true" />
                      <p className="text-xs font-medium text-muted">
                        {entry.kind === "trip" ? formatDayRange(entry.trip.startDate, entry.trip.endDate) : formatDay(entry.date, "long")}
                      </p>

                      {entry.kind === "together" && (
                        <div className="mt-1.5">
                          <h3 className="text-heading flex items-center gap-2">
                            <Sparkles className="size-4 text-subtle" /> Le début de votre histoire
                          </h3>
                          <p className="mt-1 text-sm text-muted">Ensemble depuis ce jour.</p>
                        </div>
                      )}

                      {entry.kind === "trip" && (
                        <Link href={`/trips/${entry.trip.id}`} className="group mt-2 block">
                          <h3 className="text-heading flex items-center gap-2 group-hover:underline group-hover:underline-offset-4">
                            <Plane className="size-4 text-subtle" /> {entry.trip.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-muted">{entry.trip.destination}</p>
                          {entry.trip.coverUrl && (
                            // eslint-disable-next-line @next/next/no-img-element -- couverture privée signée
                            <img src={entry.trip.coverUrl} alt="" loading="lazy" className="mt-3 aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-border" />
                          )}
                        </Link>
                      )}

                      {entry.kind === "milestone" && (
                        <div className="group mt-1.5">
                          <div className="flex items-start gap-2">
                            <h3 className="text-heading flex-1">{entry.milestone.title}</h3>
                            <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <Button variant="ghost" size="icon-sm" onClick={() => setForm({ open: true, milestone: entry.milestone })} aria-label="Modifier">
                                <Pencil />
                              </Button>
                              <Button variant="danger-ghost" size="icon-sm" onClick={() => remove(entry.milestone)} aria-label="Supprimer">
                                <Trash2 />
                              </Button>
                            </div>
                          </div>
                          {entry.milestone.description && <p className="mt-1 text-sm leading-relaxed text-muted">{entry.milestone.description}</p>}
                          {entry.milestone.photoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element -- photo privée signée
                            <img
                              src={entry.milestone.photoUrl}
                              alt=""
                              loading="lazy"
                              className="mt-3 max-h-[420px] w-full rounded-2xl object-cover ring-1 ring-border"
                              style={{ backgroundColor: entry.milestone.photoColor ?? undefined }}
                            />
                          )}
                        </div>
                      )}
                    </motion.li>
                  ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <MilestoneForm open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} milestone={form.milestone} photos={photos} />
    </>
  );
}
