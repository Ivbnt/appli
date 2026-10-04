"use client";

import { Trash2 } from "lucide-react";
import * as React from "react";
import { Marker } from "react-map-gl/maplibre";
import { toast } from "sonner";
import { LocationSearch } from "@/components/map/location-search";
import { Map, MapPinButton, type MapStyles } from "@/components/map/map";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RatingInput } from "@/components/ui/rating";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { PLACE_CATEGORIES, PLACE_CATEGORY_VALUES, type PlaceCategory, type PlaceStatus } from "@/lib/domain";
import { createPlaceAction, deletePlaceAction, updatePlaceAction } from "@/server/actions/places";
import { PLACE_ICONS } from "./place-meta";
import type { Place, TripOption } from "./types";

type Draft = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  category: PlaceCategory;
  status: PlaceStatus;
  visitedAt: string | null;
  rating: number | null;
  notes: string;
  externalUrl: string;
  tripId: string | null;
};

const fromPlace = (place: Place | null, defaults: Partial<Draft>): Draft =>
  place
    ? {
        name: place.name,
        address: place.address ?? "",
        latitude: place.latitude,
        longitude: place.longitude,
        category: place.category,
        status: place.status,
        visitedAt: place.visitedAt,
        rating: place.rating,
        notes: place.notes ?? "",
        externalUrl: place.externalUrl ?? "",
        tripId: place.tripId,
      }
    : {
        name: "",
        address: "",
        latitude: null,
        longitude: null,
        category: "restaurant",
        status: "want_to_visit",
        visitedAt: null,
        rating: null,
        notes: "",
        externalUrl: "",
        tripId: null,
        ...defaults,
      };

export function PlaceEditor({
  open,
  onOpenChange,
  place,
  styles,
  trips,
  center,
  defaults,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: Place | null;
  styles: MapStyles;
  trips: TripOption[];
  center: { latitude: number; longitude: number; zoom: number };
  defaults?: Partial<Draft>;
  onSaved: (place: Place) => void;
  onDeleted: (id: string) => void;
}) {
  const confirm = useConfirm();
  const [draft, setDraft] = React.useState<Draft>(() => fromPlace(place, defaults ?? {}));
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [view, setView] = React.useState(center);

  React.useEffect(() => {
    if (!open) return;
    const next = fromPlace(place, defaults ?? {});
    setDraft(next);
    setErrors({});
    setError(null);
    setView(next.latitude !== null ? { latitude: next.latitude, longitude: next.longitude!, zoom: 14 } : center);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- réinitialisé à chaque ouverture
  }, [open, place]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const pickPoint = async (latitude: number, longitude: number, fillAddress: boolean) => {
    setDraft((d) => ({ ...d, latitude, longitude }));
    if (!fillAddress) return;
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
      const data = (await response.json()) as { result?: { name: string; address: string } | null };
      if (data.result) setDraft((d) => ({ ...d, address: d.address || data.result!.address, name: d.name || data.result!.name }));
    } catch {
      // l'adresse reste facultative
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.latitude === null || draft.longitude === null) {
      setError("Choisissez l'emplacement : recherchez une adresse ou cliquez sur la carte.");
      return;
    }
    startTransition(async () => {
      const payload = {
        name: draft.name,
        address: draft.address || null,
        latitude: draft.latitude!,
        longitude: draft.longitude!,
        category: draft.category,
        status: draft.status,
        visitedAt: draft.visitedAt,
        rating: draft.rating,
        notes: draft.notes || null,
        externalUrl: draft.externalUrl || null,
        tripId: draft.tripId,
      };
      const result = place ? await updatePlaceAction({ id: place.id, ...payload }) : await createPlaceAction(payload);
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      onSaved(result.data);
      onOpenChange(false);
      toast.success(place ? "Lieu mis à jour" : "Lieu ajouté");
    });
  };

  const remove = async () => {
    if (!place) return;
    if (!(await confirm({ title: "Supprimer ce lieu ?", description: `« ${place.name} » sera retiré de la carte. Ses photos restent dans vos souvenirs.`, confirmLabel: "Supprimer", destructive: true }))) return;
    startTransition(async () => {
      const result = await deletePlaceAction({ id: place.id });
      if (!result.ok) return void toast.error(result.error);
      onDeleted(place.id);
      onOpenChange(false);
      toast.success("Lieu supprimé");
    });
  };

  const Icon = PLACE_ICONS[draft.category];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={place ? "Modifier le lieu" : "Ajouter un lieu"}
      footer={
        <>
          {place && (
            <Button type="button" variant="danger-ghost" size="icon" className="mr-auto" onClick={remove} aria-label="Supprimer" disabled={pending}>
              <Trash2 />
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="place-form" loading={pending}>
            {place ? "Enregistrer" : "Ajouter"}
          </Button>
        </>
      }
    >
      <form id="place-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormError message={error && !Object.keys(errors).length ? error : null} />
        <LocationSearch
          autoFocus={!place}
          onSelect={(r) => {
            setDraft((d) => ({ ...d, latitude: r.latitude, longitude: r.longitude, address: r.address, name: d.name || r.name }));
            setView({ latitude: r.latitude, longitude: r.longitude, zoom: 15 });
          }}
        />
        <div className="overflow-hidden rounded-xl border border-border">
          <Map
            styles={styles}
            className="h-52 sm:h-60"
            {...view}
            onMove={(e) => setView(e.viewState)}
            onClick={(e) => pickPoint(e.lngLat.lat, e.lngLat.lng, !draft.address)}
            cursor="crosshair"
          >
            {draft.latitude !== null && draft.longitude !== null && (
              <Marker
                latitude={draft.latitude}
                longitude={draft.longitude}
                draggable
                onDragEnd={(e) => pickPoint(e.lngLat.lat, e.lngLat.lng, false)}
              >
                <MapPinButton icon={Icon} label="Emplacement (déplaçable)" visited={draft.status === "visited"} selected />
              </Marker>
            )}
          </Map>
          <p className="border-t border-border bg-surface-muted/50 px-3 py-2 text-xs text-muted">
            {draft.latitude === null ? "Cliquez sur la carte pour placer le lieu." : "Faites glisser le repère pour ajuster l'emplacement."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" htmlFor="place-name" error={errors.name}>
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Le Comptoir" maxLength={160} />
          </Field>
          <Field label="Catégorie" htmlFor="place-category">
            <Select
              value={draft.category}
              onValueChange={(v) => set("category", v as PlaceCategory)}
              options={PLACE_CATEGORY_VALUES.map((c) => {
                const CatIcon = PLACE_ICONS[c];
                return { value: c, label: PLACE_CATEGORIES[c], icon: <CatIcon className="size-4 text-muted" /> };
              })}
            />
          </Field>
        </div>
        <Field label="Adresse" htmlFor="place-address" optional>
          <Input value={draft.address} onChange={(e) => set("address", e.target.value)} maxLength={300} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Statut</span>
          <Segmented
            label="Statut"
            value={draft.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "want_to_visit", label: "À visiter" },
              { value: "visited", label: "Visité" },
            ]}
          />
        </div>
        {draft.status === "visited" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visité le" htmlFor="place-visited" optional>
              <DatePicker value={draft.visitedAt} onChange={(v) => set("visitedAt", v)} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Note</span>
              <RatingInput value={draft.rating} onChange={(v) => set("rating", v)} max={5} label="Note sur 5" />
            </div>
          </div>
        )}
        <Field label="Notes" htmlFor="place-notes" optional>
          <Textarea value={draft.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Ce qu'on a aimé, ce qu'il faut commander…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lien" htmlFor="place-url" optional error={errors.externalUrl}>
            <Input type="url" value={draft.externalUrl} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://…" />
          </Field>
          {trips.length > 0 && (
            <Field label="Voyage" htmlFor="place-trip" optional error={errors.tripId}>
              <Select
                value={draft.tripId ?? "none"}
                onValueChange={(v) => set("tripId", v === "none" ? null : v)}
                options={[{ value: "none", label: "Aucun" }, ...trips.map((t) => ({ value: t.id, label: t.title }))]}
              />
            </Field>
          )}
        </div>
      </form>
    </Modal>
  );
}
