"use client";

import { ArrowLeft, ExternalLink, Map as MapIcon, MapPin, Move, Pencil, Plus, Search, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Marker, type MapRef } from "react-map-gl/maplibre";
import { toast } from "sonner";
import { Map, MapPinButton, type MapStyles } from "@/components/map/map";
import { PhotoStrip } from "@/components/photos/photo-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { formatDay } from "@/lib/dates";
import { PLACE_CATEGORIES, PLACE_CATEGORY_VALUES, type PlaceCategory } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { movePlaceAction } from "@/server/actions/places";
import { PlaceEditor } from "./place-editor";
import { PLACE_ICONS } from "./place-meta";
import type { Place, TripOption } from "./types";

type StatusFilter = "all" | "visited" | "want_to_visit";

const DEFAULT_VIEW = { latitude: 46.6, longitude: 2.4, zoom: 4.6 };

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function PlacesView({
  initialPlaces,
  styles,
  trips,
}: {
  initialPlaces: Place[];
  styles: MapStyles;
  trips: TripOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mapRef = React.useRef<MapRef>(null);
  const [places, setPlaces] = React.useState(initialPlaces);
  React.useEffect(() => setPlaces(initialPlaces), [initialPlaces]);

  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [category, setCategory] = React.useState<PlaceCategory | "all">("all");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [moving, setMoving] = React.useState<{ id: string; latitude: number; longitude: number } | null>(null);
  const [editor, setEditor] = React.useState<{ open: boolean; place: Place | null }>({ open: false, place: null });
  const [mobilePane, setMobilePane] = React.useState<"map" | "list">("map");

  const selected = places.find((p) => p.id === selectedId) ?? null;

  const visible = React.useMemo(() => {
    const q = normalize(query.trim());
    return places.filter(
      (place) =>
        (status === "all" || place.status === status) &&
        (category === "all" || place.category === category) &&
        (!q || normalize(`${place.name} ${place.address ?? ""} ${place.notes ?? ""}`).includes(q)),
    );
  }, [places, status, category, query]);

  const counts = React.useMemo(
    () => ({
      all: places.length,
      visited: places.filter((p) => p.status === "visited").length,
      want_to_visit: places.filter((p) => p.status === "want_to_visit").length,
    }),
    [places],
  );

  const initialView = React.useMemo(() => {
    if (initialPlaces.length === 0) return DEFAULT_VIEW;
    const lat = initialPlaces.reduce((s, p) => s + p.latitude, 0) / initialPlaces.length;
    const lng = initialPlaces.reduce((s, p) => s + p.longitude, 0) / initialPlaces.length;
    return { latitude: lat, longitude: lng, zoom: initialPlaces.length === 1 ? 12 : 5 };
  }, [initialPlaces]);

  const fitAll = React.useCallback((list: Place[]) => {
    const map = mapRef.current;
    if (!map || list.length === 0) return;
    if (list.length === 1) {
      map.flyTo({ center: [list[0]!.longitude, list[0]!.latitude], zoom: 13, duration: 600 });
      return;
    }
    const lngs = list.map((p) => p.longitude);
    const lats = list.map((p) => p.latitude);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 64, duration: 600, maxZoom: 13 },
    );
  }, []);

  const select = React.useCallback((place: Place | null) => {
    setSelectedId(place?.id ?? null);
    setMoving(null);
    if (place) {
      mapRef.current?.flyTo({ center: [place.longitude, place.latitude], zoom: Math.max(mapRef.current.getZoom(), 13), duration: 700 });
      setMobilePane("map");
    }
  }, []);

  // Ouverture depuis la recherche globale (?place=…) ou une action rapide (?new=1).
  React.useEffect(() => {
    const placeId = searchParams.get("place");
    if (placeId) {
      const place = initialPlaces.find((p) => p.id === placeId);
      if (place) window.setTimeout(() => select(place), 300);
    }
    if (searchParams.get("new")) setEditor({ open: true, place: null });
    if (placeId || searchParams.get("new")) router.replace(pathname, { scroll: false });
  }, [searchParams, initialPlaces, pathname, router, select]);

  const upsert = (place: Place) => {
    setPlaces((current) => (current.some((p) => p.id === place.id) ? current.map((p) => (p.id === place.id ? place : p)) : [place, ...current]));
    setSelectedId(place.id);
    mapRef.current?.flyTo({ center: [place.longitude, place.latitude], zoom: 14, duration: 700 });
  };

  const saveMove = async () => {
    if (!moving) return;
    const result = await movePlaceAction(moving);
    if (!result.ok) return void toast.error(result.error);
    setPlaces((current) => current.map((p) => (p.id === moving.id ? { ...p, latitude: moving.latitude, longitude: moving.longitude } : p)));
    setMoving(null);
    toast.success("Lieu déplacé");
  };

  const listPanel = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3 md:px-5 md:pt-6">
        <div className="hidden items-center justify-between md:flex">
          <h1 className="text-title">Carte</h1>
          <Button onClick={() => setEditor({ open: true, place: null })}>
            <Plus /> Lieu
          </Button>
        </div>
        <Segmented
          label="Statut"
          value={status}
          onChange={setStatus}
          className="w-full [&>button]:flex-1"
          options={[
            { value: "all", label: "Tous", count: counts.all },
            { value: "visited", label: "Visités", count: counts.visited },
            { value: "want_to_visit", label: "À visiter", count: counts.want_to_visit },
          ]}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un lieu" className="pl-9" type="search" aria-label="Rechercher un lieu" />
        </div>
        <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:-mx-5 md:px-5">
          {(["all", ...PLACE_CATEGORY_VALUES] as const).map((c) => {
            const Icon = c === "all" ? MapPin : PLACE_ICONS[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted hover:border-border-strong hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {c === "all" ? "Toutes" : PLACE_CATEGORIES[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 md:px-3">
        {places.length === 0 ? (
          <EmptyState
            compact
            className="mx-2"
            icon={MapIcon}
            title="Aucun lieu pour le moment"
            description="Ajoutez les endroits où vous êtes allés et ceux que vous voulez découvrir."
            action={
              <Button onClick={() => setEditor({ open: true, place: null })}>
                <Plus /> Ajouter un lieu
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted">Aucun lieu ne correspond à ces filtres.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {visible.map((place) => {
              const Icon = PLACE_ICONS[place.category];
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => select(place)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      selectedId === place.id ? "bg-surface-hover" : "hover:bg-surface-hover/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        place.status === "visited" ? "bg-primary text-primary-foreground" : "border border-accent/40 bg-accent-soft text-accent",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{place.name}</span>
                      <span className="block truncate text-xs text-muted">{place.address ?? PLACE_CATEGORIES[place.category]}</span>
                    </span>
                    {place.rating && <span className="tabular text-xs text-muted">{place.rating}/5</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const detailPanel = selected && (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="px-4 pt-4 md:px-5 md:pt-6">
        <Button variant="ghost" size="sm" onClick={() => select(null)} className="-ml-2">
          <ArrowLeft /> Tous les lieux
        </Button>
        <div className="mt-4 flex items-start gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", selected.status === "visited" ? "bg-primary text-primary-foreground" : "bg-accent-soft text-accent")}>
            {React.createElement(PLACE_ICONS[selected.category], { className: "size-5" })}
          </span>
          <div className="min-w-0">
            <h2 className="text-heading">{selected.name}</h2>
            {selected.address && <p className="mt-0.5 text-sm text-muted">{selected.address}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge tone={selected.status === "visited" ? "success" : "accent"}>{selected.status === "visited" ? "Visité" : "À visiter"}</Badge>
          <Badge tone="outline">{PLACE_CATEGORIES[selected.category]}</Badge>
          {selected.visitedAt && <Badge tone="neutral">{formatDay(selected.visitedAt, "medium")}</Badge>}
          {selected.rating && <Badge tone="neutral">{selected.rating}/5</Badge>}
        </div>
        {selected.notes && <p className="mt-5 text-sm leading-relaxed whitespace-pre-line">{selected.notes}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditor({ open: true, place: selected })}>
            <Pencil /> Modifier
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMoving({ id: selected.id, latitude: selected.latitude, longitude: selected.longitude })}>
            <Move /> Déplacer
          </Button>
          {selected.externalUrl && (
            <a href={selected.externalUrl} target="_blank" rel="noreferrer noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted hover:text-foreground">
              <ExternalLink className="size-3.5" /> Site
            </a>
          )}
        </div>
      </div>
      <div className="mt-6 border-t border-border px-4 py-5 md:px-5">
        <PhotoStrip key={selected.id} links={{ placeId: selected.id }} />
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom)-env(safe-area-inset-top))] flex-col md:h-[calc(100dvh-1rem)] md:flex-row">
      {/* Barre mobile */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 md:hidden">
        <Segmented
          label="Affichage"
          value={mobilePane}
          onChange={setMobilePane}
          options={[
            { value: "map", label: <span className="flex items-center gap-1.5"><MapIcon className="size-3.5" /> Carte</span> },
            { value: "list", label: <span className="flex items-center gap-1.5"><List className="size-3.5" /> Liste</span> },
          ]}
        />
        <Button className="ml-auto" size="sm" onClick={() => setEditor({ open: true, place: null })}>
          <Plus /> Lieu
        </Button>
      </div>

      <aside className={cn("min-h-0 flex-col border-border md:flex md:w-[360px] md:shrink-0 md:border-r lg:w-[380px]", mobilePane === "list" ? "flex flex-1" : "hidden")}>
        {detailPanel || listPanel}
      </aside>

      <div className={cn("relative min-h-0 flex-1 md:block", mobilePane === "map" ? "block" : "hidden")}>
        <Map
          ref={mapRef}
          styles={styles}
          className="h-full md:rounded-r-2xl"
          initialViewState={initialView}
          onLoad={() => fitAll(initialPlaces)}
          onClick={() => !moving && setSelectedId(null)}
        >
          {visible.map((place) => {
            const isMoving = moving?.id === place.id;
            return (
              <Marker
                key={place.id}
                latitude={isMoving ? moving.latitude : place.latitude}
                longitude={isMoving ? moving.longitude : place.longitude}
                draggable={isMoving}
                onDragEnd={(e) => setMoving({ id: place.id, latitude: e.lngLat.lat, longitude: e.lngLat.lng })}
                style={{ zIndex: selectedId === place.id ? 2 : 1 }}
              >
                <MapPinButton
                  icon={PLACE_ICONS[place.category]}
                  label={place.name}
                  visited={place.status === "visited"}
                  selected={selectedId === place.id}
                  onClick={() => select(place)}
                />
              </Marker>
            );
          })}
        </Map>

        {moving && (
          <div className="absolute inset-x-3 top-3 z-10 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur md:inset-x-auto md:left-1/2 md:-translate-x-1/2">
            <Move className="size-4 shrink-0 text-muted" />
            <p className="flex-1 text-sm">Faites glisser le repère à son nouvel emplacement.</p>
            <Button variant="ghost" size="sm" onClick={() => setMoving(null)}>
              Annuler
            </Button>
            <Button size="sm" onClick={saveMove}>
              Enregistrer
            </Button>
          </div>
        )}

        {/* Détail en surimpression sur mobile */}
        {selected && mobilePane === "map" && (
          <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-border bg-surface p-4 shadow-lg md:hidden">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{selected.name}</p>
                <p className="truncate text-xs text-muted">{selected.address ?? PLACE_CATEGORIES[selected.category]}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setMobilePane("list")}>
                Détails
              </Button>
            </div>
          </div>
        )}
      </div>

      <PlaceEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        place={editor.place}
        styles={styles}
        trips={trips}
        center={mapRef.current ? { latitude: mapRef.current.getCenter().lat, longitude: mapRef.current.getCenter().lng, zoom: Math.max(mapRef.current.getZoom(), 10) } : initialView}
        onSaved={upsert}
        onDeleted={(id) => {
          setPlaces((current) => current.filter((p) => p.id !== id));
          setSelectedId(null);
        }}
      />
    </div>
  );
}
