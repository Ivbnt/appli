"use client";

import { FileUp, Paperclip, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toLocalInput, todayISO } from "@/lib/dates";
import { RESERVATION_TYPES, RESERVATION_TYPE_VALUES, type ReservationType } from "@/lib/domain";
import { formatBytes } from "@/lib/utils";
import {
  createReservationAction,
  deleteReservationAction,
  removeReservationDocumentAction,
  updateReservationAction,
} from "@/server/actions/trips";
import type { Reservation } from "@/server/services/trips";
import { CURRENCIES, RESERVATION_ICONS } from "./meta";

type Draft = {
  title: string;
  type: ReservationType;
  date: string;
  time: string;
  endDate: string | null;
  endTime: string;
  location: string;
  origin: string;
  destination: string;
  provider: string;
  confirmationNumber: string;
  price: string;
  currency: string;
  url: string;
  notes: string;
  tripId: string | null;
  addToCalendar: boolean;
};

const ROUTE_TYPES: ReservationType[] = ["flight", "train", "rental"];

function toDraft(reservation: Reservation | null, defaults: Partial<Draft>): Draft {
  if (!reservation) {
    return {
      title: "",
      type: "other",
      date: todayISO(),
      time: "",
      endDate: null,
      endTime: "",
      location: "",
      origin: "",
      destination: "",
      provider: "",
      confirmationNumber: "",
      price: "",
      currency: "EUR",
      url: "",
      notes: "",
      tripId: null,
      addToCalendar: true,
      ...defaults,
    };
  }
  const start = toLocalInput(reservation.startsAt);
  const end = reservation.endsAt ? toLocalInput(reservation.endsAt) : null;
  return {
    title: reservation.title,
    type: reservation.type,
    date: start.date,
    time: reservation.hasTime ? start.time : "",
    endDate: end?.date ?? null,
    endTime: end && reservation.hasTime ? end.time : "",
    location: reservation.location ?? "",
    origin: reservation.origin ?? "",
    destination: reservation.destination ?? "",
    provider: reservation.provider ?? "",
    confirmationNumber: reservation.confirmationNumber ?? "",
    price: reservation.price ?? "",
    currency: reservation.currency,
    url: reservation.url ?? "",
    notes: reservation.notes ?? "",
    tripId: reservation.tripId,
    addToCalendar: reservation.addToCalendar,
  };
}

async function uploadDocument(reservationId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`/api/reservations/${reservationId}/document`, { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Envoi du document impossible.");
}

export function ReservationForm({
  open,
  onOpenChange,
  reservation,
  trips,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation | null;
  trips: { id: string; title: string; startDate: string }[];
  defaults?: Partial<Draft>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(reservation, defaults ?? {}));
  const [file, setFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const trip = trips.find((t) => t.id === defaults?.tripId);
    setDraft(toDraft(reservation, { ...(trip && !reservation ? { date: trip.startDate } : {}), ...defaults }));
    setFile(null);
    setErrors({});
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- réinitialisé à chaque ouverture
  }, [open, reservation]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        title: draft.title,
        type: draft.type,
        date: draft.date,
        time: draft.time || null,
        endDate: draft.endDate,
        endTime: draft.endTime || null,
        location: draft.location || null,
        origin: ROUTE_TYPES.includes(draft.type) ? draft.origin || null : null,
        destination: ROUTE_TYPES.includes(draft.type) ? draft.destination || null : null,
        provider: draft.provider || null,
        confirmationNumber: draft.confirmationNumber || null,
        price: draft.price ? Number(draft.price.replace(",", ".")) : null,
        currency: draft.currency,
        url: draft.url || null,
        notes: draft.notes || null,
        tripId: draft.tripId,
        addToCalendar: draft.addToCalendar,
      };
      const result = reservation ? await updateReservationAction({ id: reservation.id, ...payload }) : await createReservationAction(payload);
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      const id = reservation?.id ?? (result.data as { id: string }).id;
      if (file) {
        try {
          await uploadDocument(id, file);
        } catch (uploadError) {
          toast.error((uploadError as Error).message);
        }
      }
      toast.success(reservation ? "Réservation mise à jour" : "Réservation ajoutée");
      onOpenChange(false);
      router.refresh();
    });
  };

  const remove = async () => {
    if (!reservation) return;
    if (!(await confirm({ title: "Supprimer cette réservation ?", description: "Le document joint et l'événement du calendrier seront aussi supprimés.", confirmLabel: "Supprimer", destructive: true }))) return;
    startTransition(async () => {
      const result = await deleteReservationAction({ id: reservation.id });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Réservation supprimée");
      onOpenChange(false);
      router.refresh();
    });
  };

  const removeDocument = () =>
    startTransition(async () => {
      if (!reservation) return;
      const result = await removeReservationDocumentAction({ id: reservation.id });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Document retiré");
      router.refresh();
    });

  const showRoute = ROUTE_TYPES.includes(draft.type);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={reservation ? "Modifier la réservation" : "Nouvelle réservation"}
      footer={
        <>
          {reservation && (
            <Button type="button" variant="danger-ghost" size="icon" className="mr-auto" onClick={remove} aria-label="Supprimer" disabled={pending}>
              <Trash2 />
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="reservation-form" loading={pending}>
            {reservation ? "Enregistrer" : "Ajouter"}
          </Button>
        </>
      }
    >
      <form id="reservation-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormError message={error && !Object.keys(errors).length ? error : null} />
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Field label="Type" htmlFor="reservation-type">
            <Select
              value={draft.type}
              onValueChange={(v) => set("type", v as ReservationType)}
              options={RESERVATION_TYPE_VALUES.map((t) => {
                const Icon = RESERVATION_ICONS[t];
                return { value: t, label: RESERVATION_TYPES[t], icon: <Icon className="size-4 text-muted" /> };
              })}
            />
          </Field>
          <Field label="Titre" htmlFor="reservation-title" error={errors.title}>
            <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder={showRoute ? "Vol AF1404" : "Dîner chez Roscioli"} maxLength={160} />
          </Field>
        </div>

        {showRoute && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Départ" htmlFor="reservation-origin" optional>
              <Input value={draft.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Paris" />
            </Field>
            <Field label="Arrivée" htmlFor="reservation-destination" optional>
              <Input value={draft.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Rome" />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={draft.type === "hotel" ? "Arrivée" : "Date"} htmlFor="reservation-date" error={errors.date}>
            <DatePicker value={draft.date} onChange={(v) => v && set("date", v)} clearable={false} />
          </Field>
          <Field label="Heure" htmlFor="reservation-time" optional>
            <Input type="time" value={draft.time} onChange={(e) => set("time", e.target.value)} className="w-28" />
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={draft.type === "hotel" ? "Départ" : "Fin"} htmlFor="reservation-end" optional error={errors.endDate}>
            <DatePicker
              value={draft.endDate}
              onChange={(v) => set("endDate", v)}
              placeholder={draft.type === "hotel" ? "Date de départ" : "Le même jour"}
            />
          </Field>
          <Field label="Heure" htmlFor="reservation-end-time" optional>
            <Input type="time" value={draft.endTime} onChange={(e) => set("endTime", e.target.value)} className="w-28" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={showRoute ? "Compagnie" : "Prestataire"} htmlFor="reservation-provider" optional>
            <Input value={draft.provider} onChange={(e) => set("provider", e.target.value)} maxLength={120} />
          </Field>
          <Field label="N° de confirmation" htmlFor="reservation-confirmation" optional>
            <Input value={draft.confirmationNumber} onChange={(e) => set("confirmationNumber", e.target.value)} className="font-mono" maxLength={80} />
          </Field>
        </div>
        {!showRoute && (
          <Field label="Adresse" htmlFor="reservation-location" optional>
            <Input value={draft.location} onChange={(e) => set("location", e.target.value)} maxLength={300} />
          </Field>
        )}
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Prix" htmlFor="reservation-price" optional error={errors.price}>
            <Input inputMode="decimal" value={draft.price} onChange={(e) => set("price", e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Devise" htmlFor="reservation-currency">
            <NativeSelect value={draft.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lien" htmlFor="reservation-url" optional error={errors.url}>
            <Input type="url" value={draft.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
          </Field>
          {trips.length > 0 && (
            <Field label="Voyage" htmlFor="reservation-trip" optional>
              <Select
                value={draft.tripId ?? "none"}
                onValueChange={(v) => set("tripId", v === "none" ? null : v)}
                options={[{ value: "none", label: "Aucun" }, ...trips.map((t) => ({ value: t.id, label: t.title }))]}
              />
            </Field>
          )}
        </div>
        <Field label="Notes" htmlFor="reservation-notes" optional>
          <Textarea value={draft.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">
            Billet ou confirmation <span className="font-normal text-subtle">PDF ou image</span>
          </span>
          {reservation?.hasDocument && !file ? (
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm">
              <Paperclip className="size-4 text-subtle" />
              <a href={`/api/reservations/${reservation.id}/document`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate underline-offset-4 hover:underline">
                {reservation.documentName}
              </a>
              <Button type="button" variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                Remplacer
              </Button>
              <Button type="button" variant="danger-ghost" size="icon-sm" onClick={removeDocument} aria-label="Retirer le document">
                <X />
              </Button>
            </div>
          ) : file ? (
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm">
              <Paperclip className="size-4 text-subtle" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted">{formatBytes(file.size)}</span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setFile(null)} aria-label="Retirer">
                <X />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong/70 px-3 py-3 text-sm text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              <FileUp className="size-4" /> Joindre un document
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected && selected.size > 20 * 1024 * 1024) toast.error("Document trop volumineux (20 Mo maximum).");
              else if (selected) setFile(selected);
              e.target.value = "";
            }}
          />
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
          <span>
            <span className="block text-sm font-medium">Ajouter au calendrier</span>
            <span className="block text-xs text-muted">Avec un rappel par e-mail selon vos préférences.</span>
          </span>
          <Switch checked={draft.addToCalendar} onCheckedChange={(v) => set("addToCalendar", v)} aria-label="Ajouter au calendrier" />
        </label>
      </form>
    </Modal>
  );
}
