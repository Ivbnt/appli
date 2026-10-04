"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/dates";
import { useSyncedState } from "@/lib/hooks";
import { archiveTaskAction, deleteTaskAction } from "@/server/actions/tasks";
import type { Task, TaskCategory } from "./types";

export function ArchivedTasks({ tasks, categories }: { tasks: Task[]; categories: TaskCategory[] }) {
  const confirm = useConfirm();
  const [items, setItems] = useSyncedState(tasks);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  if (items.length === 0) {
    return <EmptyState icon={Archive} title="Aucune archive" description="Les tâches archivées apparaîtront ici. Vous pourrez les restaurer à tout moment." />;
  }

  const restore = async (task: Task) => {
    const result = await archiveTaskAction({ id: task.id, archived: false });
    if (!result.ok) return void toast.error(result.error);
    setItems((current) => current.filter((t) => t.id !== task.id));
    toast.success("Tâche restaurée");
  };

  const remove = async (task: Task) => {
    if (!(await confirm({ title: "Supprimer définitivement ?", description: `« ${task.title} »`, confirmLabel: "Supprimer", destructive: true }))) return;
    const result = await deleteTaskAction({ id: task.id });
    if (!result.ok) return void toast.error(result.error);
    setItems((current) => current.filter((t) => t.id !== task.id));
  };

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((task) => (
        <li key={task.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{task.title}</p>
            <p className="text-xs text-muted">
              {[task.categoryId ? categoryMap.get(task.categoryId) : null, task.archivedAt ? `Archivée le ${formatDate(task.archivedAt, "medium")}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => restore(task)}>
            <ArchiveRestore /> Restaurer
          </Button>
          <Button variant="danger-ghost" size="icon-sm" onClick={() => remove(task)} aria-label="Supprimer définitivement">
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}
