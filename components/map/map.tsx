"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { useTheme } from "next-themes";
import * as React from "react";
import MapGL, { NavigationControl, type MapRef, type MapProps } from "react-map-gl/maplibre";
import { cn } from "@/lib/utils";

// Worker servi depuis /public (copié par scripts/vendor-assets.mjs).
if (typeof window !== "undefined") setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

export type MapStyles = { light: string; dark: string };

type Props = Omit<MapProps, "mapStyle"> & {
  styles: MapStyles;
  className?: string;
  children?: React.ReactNode;
  controls?: boolean;
};

/**
 * Carte (MapLibre GL) : fond clair ou sombre selon le thème, contrôles discrets.
 * Un fond neutre reste visible si les tuiles ne peuvent pas être chargées.
 */
export const Map = React.forwardRef<MapRef, Props>(function Map({ styles, className, children, controls = true, ...props }, ref) {
  const { resolvedTheme } = useTheme();
  const [failed, setFailed] = React.useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
      <MapGL
        ref={ref}
        mapStyle={resolvedTheme === "dark" ? styles.dark : styles.light}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
        cooperativeGestures={false}
        dragRotate={false}
        onError={() => setFailed(true)}
        {...props}
      >
        {controls && <NavigationControl position="top-right" showCompass={false} />}
        {children}
      </MapGL>
      {failed && (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-surface/90 px-2.5 py-1.5 text-[11px] text-muted shadow-sm">
          Fond de carte indisponible (connexion au service de tuiles impossible).
        </p>
      )}
    </div>
  );
});

/** Repère circulaire : plein pour un lieu visité, contour pour un lieu à visiter. */
export function MapPinButton({
  icon: Icon,
  label,
  visited,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  visited: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-full border-2 shadow-md transition-transform duration-150 hover:scale-110",
        visited ? "border-surface bg-primary text-primary-foreground" : "border-accent bg-surface text-accent",
        selected && "scale-125 ring-4 ring-accent/25",
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.2} />
    </button>
  );
}
