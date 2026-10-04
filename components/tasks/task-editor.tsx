"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useMembers, useShell } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/domain";
import { archiveTaskAction, createTaskAction, deleteTaskAction, updateTaskAction } from "@/server/actions/tasks";
import type { Task, TaskCategory } from "./types";

type Draft = {
  title: string;
  description: string;
  categoryId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  assignedToId: string | null;
};

const emptyDraft = (defaults: Partial<Draft>): Draft => ({
  title: "",
  description: "",
  categoryId: null,
  priority: "medium",
  status: "todo",
  dueDate: null,
  assignedToId: null,
  ...defaults,
});

export function TaskEditor({
  open,
  onOpenChange,
  task,
  categories,
  defaults,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  categories: TaskCategory[];
  defaults?: Partial<Draft>;
  onSaved: (task: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const members = useMembers();
  const { user } = useShell();
  const confirm = useConfirm();
  const [draft, setDraft] = React.useState<Draft>(() => emptyDraft(defaults ?? {}));
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setError(null);
    setDraft(
      task
        ? {
            title: task.title,
            description: task.description ?? "",
            categoryId: task.categoryId,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate,
            assignedToId: task.assignedToId,
          }
        : emptyDraft(defaults ?? {}),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- réinitialisé à chaque ouverture
  }, [open, task]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const payload = { ...draft, description: draft.description || null };
      const result = task ? await updateTaskAction({ id: task.id, ...payload }) : await createTaskAction(payload);
      if (!result.ok) {
        setError(result.error);
        setErrors(result.fieldErrors ?? {});
        return;
      }
      onSaved(result.data);
      onOpenChange(false);
      toast.success(task ? "Tâche mise à jour" : "Tâche ajoutée");
    });
  };

  const remove = async () => {
    if (!task) return;
    const ok = await confirm({ title: "Supprimer cette tâche ?", description: `« ${task.title} » sera définitivement supprimée.`, confirmLabel: "Supprimer", destructive: true });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteTaskAction({ id: task.id });
      if (!result.ok) return void toast.error(result.error);
      onDeleted(task.id);
      onOpenChange(false);
      toast.success("Tâche supprimée");
    });
  };

  const toggleArchive = () => {
    if (!task) return;
    startTransition(async () => {
      const archived = !task.archivedAt;
      const result = await archiveTaskAction({ id: task.id, archived });
      if (!result.ok) return void toast.error(result.error);
      onDeleted(task.id);
      onOpenChange(false);
      toast.success(archived ? "Tâche archivée" : "Tâche restaurée");
    });
  };

  const memberOptions = [
    { value: "none", label: "Personne" },
    ...members.map((m) => ({ value: m.id, label: m.id === user.id ? `${m.name} (moi)` : m.name })),
  ];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={task ? "Modifier la tâche" : "Nouvelle tâche"}
      footer={
        <>
          {task && (
            <div className="mr-auto flex gap-1">
              <Button type="button" variant="danger-ghost" size="icon" onClick={remove} aria-label="Supprimer" disabled={pending}>
                <Trash2 />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={toggleArchive} aria-label={task.archivedAt ? "Restaurer" : "Archiver"} disabled={pending}>
                {task.archivedAt ? <ArchiveRestore /> : <Archive />}
              </Button>
            </div>
          )}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="task-form" loading={pending}>
            {task ? "Enregistrer" : "Ajouter"}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormError message={error && !Object.keys(errors).length ? error : null} />
        <Field label="Titre" htmlFor="task-title" error={errors.title}>
          <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Réserver le restaurant" autoFocus maxLength={200} />
        </Field>
        <Field label="Description" htmlFor="task-description" optional error={errors.description}>
          <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Détails, liens, idées…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie" htmlFor="task-category">
            <Select
              value={draft.categoryId ?? "none"}
              onValueChange={(v) => set("categoryId", v === "none" ? null : v)}
              options={[{ value: "none", label: "Aucune" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </Field>
          <Field label="Assignée à" htmlFor="task-assignee" error={errors.assignedToId}>
            <Select value={draft.assignedToId ?? "none"} onValueChange={(v) => set("assignedToId", v === "none" ? null : v)} options={memberOptions} />
          </Field>
        </div>
        <Field label="Échéance" htmlFor="task-due" optional error={errors.dueDate}>
          <DatePicker value={draft.dueDate} onChange={(v) => set("dueDate", v)} placeholder="Aucune échéance" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Priorité</span>
            <Segmented
              label="Priorité"
              value={draft.priority}
              onChange={(v) => set("priority", v)}
              options={(Object.keys(TASK_PRIORITIES) as TaskPriority[]).map((v) => ({ value: v, label: TASK_PRIORITIES[v] }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Statut</span>
            <Segmented
              label="Statut"
              value={draft.status}
              onChange={(v) => set("status", v)}
              options={(Object.keys(TASK_STATUSES) as TaskStatus[]).map((v) => ({ value: v, label: TASK_STATUSES[v] }))}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
