"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { LocationSearch } from "@/components/map/location-search";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { addDays, todayISO } from "@/lib/dates";
import { createTripAction, deleteTripAction, updateTripAction } from "@/server/actions/trips";
import type { TripSummary } from "@/server/services/trips";

async function uploadCover(tripId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`/api/trips/${tripId}/cover`, { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Import de la couverture impossible.");
}

export function TripForm({ open, onOpenChange, trip }: { open: boolean; onOpenChange: (open: boolean) => void; trip?: TripSummary | null }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [title, setTitle] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [coords, setCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [startDate, setStartDate] = React.useState<string | null>(null);
  const [endDate, setEndDate] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");
  const [cover, setCover] = React.useState<{ file: File; preview: string } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle(trip?.title ?? "");
    setDestination(trip?.destination ?? "");
    setCoords(trip?.latitude != null && trip.longitude != null ? { latitude: trip.latitude, longitude: trip.longitude } : null);
    setStartDate(trip?.startDate ?? addDays(todayISO(), 30));
    setEndDate(trip?.endDate ?? addDays(todayISO(), 34));
    setDescription(trip?.description ?? "");
    setCover(null);
    setErrors({});
    setError(null);
  }, [open, trip]);

  React.useEffect(
    () => () => {
      if (cover) URL.revokeObjectURL(cover.preview);
    },
    [cover],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        title,
        destination,
        startDate: startDate ?? "",
        endDate: endDate ?? "",
        description: description || null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      };
      const result = trip ? await updateTripAction({ id: trip.id, ...payload }) : await createTripAction(payload);
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      const id = trip?.id ?? (result.data as { id: string }).id;
      if (cover) {
        try {
          await uploadCover(id, cover.file);
        } catch (uploadError) {
          toast.error((uploadError as Error).message);
        }
      }
      toast.success(trip ? "Voyage mis à jour" : "Voyage créé");
      onOpenChange(false);
      if (trip) router.refresh();
      else router.push(`/trips/${id}`);
    });
  };

  const remove = async () => {
    if (!trip) return;
    const ok = await confirm({
      title: "Supprimer ce voyage ?",
      description: "Les réservations, lieux et photos associés sont conservés mais ne seront plus rattachés au voyage.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteTripAction({ id: trip.id });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Voyage supprimé");
      onOpenChange(false);
      router.push("/trips");
    });
  };

  const coverPreview = cover?.preview ?? trip?.coverUrl ?? null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={trip ? "Modifier le voyage" : "Nouveau voyage"}
      footer={
        <>
          {trip && (
            <Button type="button" variant="danger-ghost" size="icon" className="mr-auto" onClick={remove} aria-label="Supprimer" disabled={pending}>
              <Trash2 />
            </Button>
          )}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="trip-form" loading={pending}>
            {trip ? "Enregistrer" : "Créer le voyage"}
          </Button>
        </>
      }
    >
      <form id="trip-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormError message={error && !Object.keys(errors).length ? error : null} />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="group relative flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong/70 bg-surface-muted transition-colors hover:border-border-strong"
          aria-label="Choisir une image de couverture"
        >
          {coverPreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local ou image privée signée */}
              <img src={coverPreview} alt="" className="absolute inset-0 size-full object-cover" />
              <span className="relative rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                Changer la couverture
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted">
              <ImagePlus className="size-5" strokeWidth={1.5} /> Image de couverture
            </span>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setCover({ file, preview: URL.createObjectURL(file) });
            e.target.value = "";
          }}
        />
        <Field label="Titre" htmlFor="trip-title" error={errors.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rome" maxLength={120} />
        </Field>
        <Field label="Destination" htmlFor="trip-destination" error={errors.destination} hint="Ville, région ou pays.">
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Rome, Italie" maxLength={160} />
        </Field>
        <LocationSearch
          placeholder="Situer la destination sur la carte (facultatif)"
          onSelect={(r) => {
            setCoords({ latitude: r.latitude, longitude: r.longitude });
            if (!destination) setDestination(r.address.split(",").slice(0, 2).join(",").trim());
          }}
        />
        {coords && <p className="-mt-2 text-xs text-muted">Destination située sur la carte.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Départ" htmlFor="trip-start" error={errors.startDate}>
            <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (v && endDate && endDate < v) setEndDate(v); }} clearable={false} />
          </Field>
          <Field label="Retour" htmlFor="trip-end" error={errors.endDate}>
            <DatePicker value={endDate} onChange={setEndDate} clearable={false} />
          </Field>
        </div>
        <Field label="Description" htmlFor="trip-description" optional>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Envies, idées, programme…" />
        </Field>
      </form>
    </Modal>
  );
}
