"use client";

import { Plus, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addActivityAction, deleteActivityAction } from "@/server/actions/fun";
import type { Activity } from "@/server/services/fun";

/** Gestion d'une liste d'activités (ajout / suppression). */
export function ActivityPoolEditor({
  activities,
  pool,
  onChange,
}: {
  activities: Activity[];
  pool: "tonight" | "wheel";
  onChange: (activities: Activity[]) => void;
}) {
  const [label, setLabel] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const value = label.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await addActivityAction({ label: value, pool });
      if (!result.ok) return void toast.error(result.fieldErrors?.label?.[0] ?? result.error);
      onChange([...activities, result.data]);
      setLabel("");
    });
  };

  const remove = (activity: Activity) =>
    startTransition(async () => {
      const result = await deleteActivityAction({ id: activity.id });
      if (!result.ok) return void toast.error(result.error);
      onChange(activities.filter((a) => a.id !== activity.id));
    });

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {activities.map((activity) => (
          <li key={activity.id} className="flex h-8 items-center gap-1 rounded-full border border-border bg-surface pr-1 pl-3 text-[13px]">
            {activity.label}
            {activity.doneCount > 0 && <span className="ml-1 text-xs text-subtle tabular">×{activity.doneCount}</span>}
            <button
              type="button"
              onClick={() => remove(activity)}
              className="flex size-6 items-center justify-center rounded-full text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label={`Retirer ${activity.label}`}
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 flex max-w-md gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ajouter une activité" aria-label="Nouvelle activité" maxLength={60} />
        <Button type="submit" variant="secondary" loading={pending} disabled={!label.trim()}>
          <Plus /> Ajouter
        </Button>
      </form>
    </div>
  );
}
