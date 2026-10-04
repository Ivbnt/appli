"use client";

import { cn } from "@/lib/utils";

/** Note de 1 à `max` sous forme de pastilles (pas d'étoiles ni de cœurs). */
export function RatingInput({
  value,
  onChange,
  max = 10,
  label,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const active = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} sur ${max}`}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "tabular flex size-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors duration-150",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export function RatingDisplay({ value, max = 10, className }: { value: number | null; max?: number; className?: string }) {
  if (value === null) return null;
  return (
    <span className={cn("tabular inline-flex items-baseline gap-0.5 font-semibold", className)}>
      {Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",")}
      <span className="text-[0.75em] font-medium text-subtle">/{max}</span>
    </span>
  );
}
