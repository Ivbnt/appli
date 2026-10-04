"use client";

import { Check } from "lucide-react";
import * as React from "react";
import { formatDate, toISODay } from "@/lib/dates";
import { cn, ucfirst } from "@/lib/utils";
import type { Photo } from "./types";

function PhotoTile({
  photo,
  onOpen,
  selectable,
  selected,
  onToggle,
  priority,
}: {
  photo: Photo;
  onOpen: () => void;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const label = photo.description ?? `Photo du ${formatDate(photo.takenAt ?? photo.createdAt, "long")}`;
  return (
    <button
      type="button"
      onClick={selectable ? onToggle : onOpen}
      aria-label={selectable ? `${selected ? "Désélectionner" : "Sélectionner"} : ${label}` : label}
      aria-pressed={selectable ? selected : undefined}
      className="group relative aspect-square overflow-hidden outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ backgroundColor: photo.dominantColor ?? undefined }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- miniature privée, déjà optimisée côté serveur */}
      <img
        src={photo.thumbUrl}
        alt={label}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "size-full object-cover transition-[opacity,transform] duration-300 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          !selectable && "group-hover:scale-[1.03]",
          selectable && selected && "scale-[0.88] rounded-lg",
        )}
      />
      {!selectable && <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />}
      {selectable && (
        <span
          className={cn(
            "absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full border-2 border-white shadow-sm transition-colors",
            selected ? "bg-accent" : "bg-black/20",
          )}
        >
          {selected && <Check className="size-3.5 text-white" strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}

/** Grille de photos façon Apple Photos : carrés serrés, regroupés par mois. */
export function PhotoGrid({
  photos,
  onOpen,
  groupByMonth = true,
  selectable,
  selected,
  onToggle,
  className,
}: {
  photos: Photo[];
  onOpen: (index: number) => void;
  groupByMonth?: boolean;
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  className?: string;
}) {
  const groups = React.useMemo(() => {
    if (!groupByMonth) return [{ key: "all", label: "", items: photos.map((photo, index) => ({ photo, index })) }];
    const map = new Map<string, { key: string; label: string; items: { photo: Photo; index: number }[] }>();
    photos.forEach((photo, index) => {
      const day = toISODay(photo.takenAt ?? photo.createdAt);
      const key = day.slice(0, 7);
      if (!map.has(key)) map.set(key, { key, label: ucfirst(formatDate(photo.takenAt ?? photo.createdAt, "monthYear")), items: [] });
      map.get(key)!.items.push({ photo, index });
    });
    return [...map.values()];
  }, [photos, groupByMonth]);

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label || "Photos"}>
          {group.label && <h2 className="text-heading sticky top-14 z-[5] -mx-1 mb-3 bg-background/80 px-1 py-1 backdrop-blur md:top-0 md:bg-surface/80">{group.label}</h2>}
          <div className="-mx-4 grid grid-cols-3 gap-0.5 sm:mx-0 sm:grid-cols-4 sm:gap-1 sm:overflow-hidden sm:rounded-xl md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {group.items.map(({ photo, index }) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                priority={index < 12}
                onOpen={() => onOpen(index)}
                selectable={selectable}
                selected={selected?.has(photo.id)}
                onToggle={() => onToggle?.(photo.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
