import type { EventType } from "@/lib/domain";

/** Teintes discrètes et désaturées par type d'événement (aucun rose ni rouge). */
export const EVENT_STYLES: Record<EventType, { dot: string; chip: string; bar: string }> = {
  appointment: {
    dot: "bg-[oklch(0.6_0.12_255)]",
    chip: "bg-[oklch(0.6_0.12_255/0.1)] text-[oklch(0.42_0.1_255)] dark:text-[oklch(0.82_0.08_255)]",
    bar: "border-l-[oklch(0.6_0.12_255)]",
  },
  birthday: {
    dot: "bg-[oklch(0.75_0.13_75)]",
    chip: "bg-[oklch(0.75_0.13_75/0.14)] text-[oklch(0.45_0.09_65)] dark:text-[oklch(0.85_0.1_80)]",
    bar: "border-l-[oklch(0.75_0.13_75)]",
  },
  important_date: {
    dot: "bg-[oklch(0.58_0.1_295)]",
    chip: "bg-[oklch(0.58_0.1_295/0.1)] text-[oklch(0.42_0.09_295)] dark:text-[oklch(0.82_0.07_295)]",
    bar: "border-l-[oklch(0.58_0.1_295)]",
  },
  trip: {
    dot: "bg-[oklch(0.62_0.09_195)]",
    chip: "bg-[oklch(0.62_0.09_195/0.12)] text-[oklch(0.42_0.07_200)] dark:text-[oklch(0.84_0.07_195)]",
    bar: "border-l-[oklch(0.62_0.09_195)]",
  },
  restaurant: {
    dot: "bg-[oklch(0.68_0.12_55)]",
    chip: "bg-[oklch(0.68_0.12_55/0.12)] text-[oklch(0.46_0.1_50)] dark:text-[oklch(0.84_0.09_60)]",
    bar: "border-l-[oklch(0.68_0.12_55)]",
  },
  concert: {
    dot: "bg-[oklch(0.55_0.12_275)]",
    chip: "bg-[oklch(0.55_0.12_275/0.1)] text-[oklch(0.42_0.11_275)] dark:text-[oklch(0.82_0.08_275)]",
    bar: "border-l-[oklch(0.55_0.12_275)]",
  },
  activity: {
    dot: "bg-[oklch(0.62_0.11_150)]",
    chip: "bg-[oklch(0.62_0.11_150/0.12)] text-[oklch(0.42_0.08_150)] dark:text-[oklch(0.84_0.08_150)]",
    bar: "border-l-[oklch(0.62_0.11_150)]",
  },
  reservation: {
    dot: "bg-[oklch(0.55_0.03_250)]",
    chip: "bg-[oklch(0.55_0.03_250/0.12)] text-[oklch(0.4_0.03_250)] dark:text-[oklch(0.84_0.02_250)]",
    bar: "border-l-[oklch(0.55_0.03_250)]",
  },
  other: {
    dot: "bg-[oklch(0.65_0.01_285)]",
    chip: "bg-surface-muted text-muted",
    bar: "border-l-border-strong",
  },
};
