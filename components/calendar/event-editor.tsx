"use client";

import { Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toLocalInput, todayISO } from "@/lib/dates";
import { useOnChange } from "@/lib/hooks";
import { EVENT_TYPES, EVENT_TYPE_VALUES, RECURRENCES, REMINDER_OPTIONS, type EventType, type Recurrence } from "@/lib/domain";
import { createEventAction, deleteEventAction, updateEventAction } from "@/server/actions/calendar";
import { EVENT_STYLES } from "./event-style";
import type { Occurrence } from "./types";

type Draft = {
  title: string;
  description: string;
  type: EventType;
  allDay: boolean;
  startDay: string;
  startTime: string;
  endDay: string | null;
  endTime: string;
  location: string;
  recurrence: Recurrence;
  reminderMinutes: number | null;
};

export type EventDefaults = { day?: string; time?: string };

function draftFrom(event: Occurrence | null, defaults: EventDefaults, defaultReminder: number | null): Draft {
  if (event) {
    const start = toLocalInput(event.startDate);
    const end = event.endDate ? toLocalInput(event.endDate) : null;
    return {
      title: event.title,
      description: event.description ?? "",
      type: event.type,
      allDay: event.allDay,
      startDay: start.date,
      startTime: start.time,
      endDay: end && end.date !== start.date ? end.date : null,
      endTime: end?.time ?? "",
      location: event.location ?? "",
      recurrence: event.recurrence,
      reminderMinutes: event.reminderMinutes,
    };
  }
  const time = defaults.time ?? "19:00";
  const [h, m] = time.split(":").map(Number);
  return {
    title: "",
    description: "",
    type: "appointment",
    allDay: false,
    startDay: defaults.day ?? todayISO(),
    startTime: time,
    endDay: null,
    endTime: `${String(Math.min(23, h! + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    location: "",
    recurrence: "none",
    reminderMinutes: defaultReminder,
  };
}

export function EventEditor({
  open,
  onOpenChange,
  event,
  defaults,
  defaultReminder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Occurrence | null;
  defaults: EventDefaults;
  defaultReminder: number | null;
}) {
  const confirm = useConfirm();
  const [draft, setDraft] = React.useState<Draft>(() => draftFrom(event, defaults, defaultReminder));
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  useOnChange(open ? event ?? defaults : null, (key) => {
    if (key === null) return;
    setDraft(draftFrom(event, defaults, defaultReminder));
    setErrors({});
    setError(null);
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        title: draft.title,
        description: draft.description || null,
        type: draft.type,
        allDay: draft.allDay,
        startDay: draft.startDay,
        startTime: draft.allDay ? null : draft.startTime || null,
        endDay: draft.endDay,
        endTime: draft.allDay ? null : draft.endTime || null,
        location: draft.location || null,
        recurrence: draft.recurrence,
        reminderMinutes: draft.reminderMinutes,
      };
      const result = event ? await updateEventAction({ id: event.id, ...payload }) : await createEventAction(payload);
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      toast.success(event ? "Événement mis à jour" : "Événement ajouté");
      onOpenChange(false);
    });
  };

  const remove = async () => {
    if (!event) return;
    const ok = await confirm({
      title: "Supprimer cet événement ?",
      description: event.recurrence === "yearly" ? "Toutes les occurrences annuelles seront supprimées." : `« ${event.title} » sera supprimé.`,
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteEventAction({ id: event.id });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Événement supprimé");
      onOpenChange(false);
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={event ? "Modifier l'événement" : "Nouvel événement"}
      footer={
        <>
          {event && (
            <Button type="button" variant="danger-ghost" size="icon" className="mr-auto" onClick={remove} aria-label="Supprimer" disabled={pending}>
              <Trash2 />
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="event-form" loading={pending}>
            {event ? "Enregistrer" : "Ajouter"}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormError message={error && !Object.keys(errors).length ? error : null} />
        <Field label="Titre" htmlFor="event-title" error={errors.title}>
          <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Dîner chez Paul" autoFocus maxLength={200} />
        </Field>
        <Field label="Type" htmlFor="event-type">
          <Select
            value={draft.type}
            onValueChange={(v) => {
              const type = v as EventType;
              setDraft((d) => ({
                ...d,
                type,
                ...(type === "birthday" || type === "important_date" ? { allDay: true, recurrence: d.recurrence === "none" && !event ? "yearly" : d.recurrence } : {}),
              }));
            }}
            options={EVENT_TYPE_VALUES.filter((t) => t !== "reservation" && t !== "trip").map((t) => ({
              value: t,
              label: EVENT_TYPES[t],
              icon: <span className={`size-2 rounded-full ${EVENT_STYLES[t].dot}`} aria-hidden="true" />,
            }))}
          />
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
          <span className="text-sm font-medium">Toute la journée</span>
          <Switch checked={draft.allDay} onCheckedChange={(v) => set("allDay", v)} aria-label="Toute la journée" />
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Début" htmlFor="event-start" error={errors.startDay}>
            <DatePicker value={draft.startDay} onChange={(v) => v && set("startDay", v)} clearable={false} />
          </Field>
          {!draft.allDay && (
            <Field label="Heure" htmlFor="event-start-time" error={errors.startTime}>
              <Input type="time" value={draft.startTime} onChange={(e) => set("startTime", e.target.value)} className="w-28" />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Fin" htmlFor="event-end" optional error={errors.endDay}>
            <DatePicker value={draft.endDay} onChange={(v) => set("endDay", v)} placeholder="Le même jour" />
          </Field>
          {!draft.allDay && (
            <Field label="Heure" htmlFor="event-end-time" error={errors.endTime}>
              <Input type="time" value={draft.endTime} onChange={(e) => set("endTime", e.target.value)} className="w-28" />
            </Field>
          )}
        </div>
        <Field label="Lieu" htmlFor="event-location" optional>
          <Input value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="Adresse ou nom du lieu" maxLength={300} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Répétition" htmlFor="event-recurrence">
            <Select
              value={draft.recurrence}
              onValueChange={(v) => set("recurrence", v as Recurrence)}
              options={(Object.keys(RECURRENCES) as Recurrence[]).map((r) => ({ value: r, label: RECURRENCES[r] }))}
            />
          </Field>
          <Field label="Rappel par e-mail" htmlFor="event-reminder">
            <Select
              value={String(draft.reminderMinutes ?? "none")}
              onValueChange={(v) => set("reminderMinutes", v === "none" ? null : Number(v))}
              options={REMINDER_OPTIONS.map((o) => ({ value: String(o.value ?? "none"), label: o.label }))}
            />
          </Field>
        </div>
        <Field label="Notes" htmlFor="event-description" optional>
          <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </Field>
      </form>
    </Modal>
  );
}
