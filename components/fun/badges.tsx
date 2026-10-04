"use client";

import { Check, ChefHat, Clapperboard, Film, Flag, Image as ImageIcon, Images, MapPin, Plane, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { BadgeProgress } from "@/server/services/badges";

const ICONS: Record<string, LucideIcon> = {
  plane: Plane,
  "map-pin": MapPin,
  utensils: UtensilsCrossed,
  clapperboard: Clapperboard,
  film: Film,
  sparkles: Sparkles,
  "chef-hat": ChefHat,
  image: ImageIcon,
  images: Images,
  flag: Flag,
  check: Check,
};

/** Badges discrets : une pastille, un nom, une progression — aucune gamification tapageuse. */
export function Badges({ badges }: { badges: BadgeProgress[] }) {
  const reduce = useReducedMotion();
  const earned = badges.filter((b) => b.awardedAt).length;
  return (
    <div>
      <p className="mb-6 text-sm text-muted">
        <span className="font-medium text-foreground tabular">{earned}</span> sur {badges.length} obtenus. Ils se débloquent tout seuls, au fil de ce que vous vivez.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge, index) => {
          const Icon = ICONS[badge.icon] ?? Sparkles;
          const done = Boolean(badge.awardedAt);
          const progress = Math.min(1, badge.value / badge.threshold);
          return (
            <motion.li
              key={badge.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={cn("flex items-center gap-4 rounded-2xl border p-4", done ? "border-border bg-surface shadow-xs" : "border-dashed border-border-strong/60")}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-primary text-primary-foreground" : "bg-surface-muted text-subtle",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", !done && "text-muted")}>{badge.name}</p>
                <p className="truncate text-xs text-muted">{badge.description}</p>
                {done ? (
                  <p className="mt-1 text-xs text-subtle">Obtenu le {formatDate(badge.awardedAt!, "long")}</p>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-border-strong" style={{ width: `${progress * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-subtle tabular">
                      {Math.min(badge.value, badge.threshold)}/{badge.threshold}
                    </span>
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
