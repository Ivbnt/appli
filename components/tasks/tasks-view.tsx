"use client";

import { Archive, CheckSquare, Columns3, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useMembers, useShell } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownCheckboxItem, DropdownContent, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import type { TaskStatus } from "@/lib/domain";
import { useSearchParamIntent, useSyncedState } from "@/lib/hooks";
import { archiveCompletedAction, createTaskAction, moveTaskAction, setTaskDoneAction } from "@/server/actions/tasks";
import { TaskBoard } from "./task-board";
import { TaskEditor } from "./task-editor";
import { TaskList } from "./task-list";
import { PRIORITY_WEIGHT, type Task, type TaskCategory, type TaskFilters, type TaskSort } from "./types";

const SORTS: { value: TaskSort; label: string }[] = [
  { value: "manual", label: "Ordre manuel" },
  { value: "due", label: "Échéance" },
  { value: "priority", label: "Priorité" },
  { value: "recent", label: "Plus récentes" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const copy = [...tasks];
  switch (sort) {
    case "manual":
      return copy.sort((a, b) => a.position - b.position);
    case "due":
      return copy.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.position - b.position);
    case "priority":
      return copy.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.position - b.position);
    case "recent":
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export function TasksView({ initialTasks, categories }: { initialTasks: Task[]; categories: TaskCategory[] }) {
  const { user } = useShell();
  const members = useMembers();

  const [tasks, setTasks] = useSyncedState(initialTasks);

  const [view, setView] = React.useState<"board" | "list">("board");
  const [sort, setSort] = React.useState<TaskSort>("manual");
  const [filters, setFilters] = React.useState<TaskFilters>({ query: "", categoryId: "all", assignee: "all", priority: "all" });
  const [editor, setEditor] = React.useState<{ open: boolean; task: Task | null; status?: TaskStatus }>({ open: false, task: null });
  const [quickTitle, setQuickTitle] = React.useState("");

  const categoryMap = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const memberMap = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const partner = members.find((m) => m.id !== user.id);

  // Ouverture depuis la recherche globale (?task=…) ou une action rapide (?new=1).
  useSearchParamIntent(["task", "new"], (params) => {
    const taskId = params.get("task");
    const task = taskId ? initialTasks.find((t) => t.id === taskId) : null;
    if (task) setEditor({ open: true, task });
    else if (params.get("new")) setEditor({ open: true, task: null });
  });

  const visible = React.useMemo(() => {
    const q = normalize(filters.query.trim());
    const filtered = tasks.filter((task) => {
      if (q && !normalize(`${task.title} ${task.description ?? ""}`).includes(q)) return false;
      if (filters.categoryId !== "all" && task.categoryId !== filters.categoryId) return false;
      if (filters.priority !== "all" && task.priority !== filters.priority) return false;
      if (filters.assignee === "me" && task.assignedToId !== user.id) return false;
      if (filters.assignee === "partner" && (!partner || task.assignedToId !== partner.id)) return false;
      if (filters.assignee === "none" && task.assignedToId) return false;
      return true;
    });
    return sortTasks(filtered, sort);
  }, [tasks, filters, sort, user.id, partner]);

  const activeFilterCount =
    Number(filters.categoryId !== "all") + Number(filters.assignee !== "all") + Number(filters.priority !== "all");
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const upsert = (task: Task) =>
    setTasks((current) => (current.some((t) => t.id === task.id) ? current.map((t) => (t.id === task.id ? task : t)) : [task, ...current]));

  const toggle = async (task: Task, done: boolean) => {
    upsert({ ...task, status: done ? "done" : "todo", completedAt: done ? new Date() : null });
    const result = await setTaskDoneAction({ id: task.id, done });
    if (!result.ok) {
      toast.error(result.error);
      upsert(task);
    } else upsert(result.data);
  };

  const move = async (input: { id: string; status: TaskStatus; beforeId: string | null; afterId: string | null }) => {
    const previous = tasks;
    const before = tasks.find((t) => t.id === input.beforeId)?.position;
    const after = tasks.find((t) => t.id === input.afterId)?.position;
    const position = before !== undefined && after !== undefined ? (before + after) / 2 : before !== undefined ? before + 1024 : after !== undefined ? after - 1024 : 0;
    setTasks((current) => current.map((t) => (t.id === input.id ? { ...t, status: input.status, position } : t)));
    const result = await moveTaskAction(input);
    if (!result.ok) {
      toast.error(result.error);
      setTasks(previous);
    } else upsert(result.data);
  };

  const quickAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    setQuickTitle("");
    const result = await createTaskAction({
      title,
      description: null,
      categoryId: filters.categoryId === "all" ? null : filters.categoryId,
      priority: "medium",
      status: "todo",
      dueDate: null,
      assignedToId: null,
    });
    if (!result.ok) {
      toast.error(result.error);
      setQuickTitle(title);
    } else upsert(result.data);
  };

  const archiveDone = async () => {
    const result = await archiveCompletedAction({});
    if (!result.ok) return void toast.error(result.error);
    setTasks((current) => current.filter((t) => t.status !== "done"));
    toast.success(result.data > 1 ? `${result.data} tâches archivées` : "Tâche archivée");
  };

  const resetFilters = () => setFilters({ query: "", categoryId: "all", assignee: "all", priority: "all" });

  return (
    <>
      <div className="mb-6 flex flex-col gap-3">
        <form onSubmit={quickAdd} className="relative">
          <Plus className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Ajouter une tâche… (Entrée pour valider)"
            aria-label="Ajouter rapidement une tâche"
            className="h-11 rounded-xl pl-10 sm:h-11"
            maxLength={200}
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <Input
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
              placeholder="Rechercher"
              aria-label="Rechercher une tâche"
              className="pl-9"
              type="search"
            />
          </div>

          <div className="w-44">
            <Select
              value={filters.categoryId}
              onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
              options={[{ value: "all", label: "Toutes catégories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>

          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="secondary" aria-label="Filtres et tri">
                <SlidersHorizontal />
                <span className="hidden sm:inline">Filtres</span>
                {activeFilterCount > 0 && (
                  <span className="tabular flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownTrigger>
            <DropdownContent className="w-56">
              <DropdownLabel>Assignée à</DropdownLabel>
              {(
                [
                  ["all", "Tout le monde"],
                  ["me", "Moi"],
                  ...(partner ? [["partner", partner.name]] : []),
                  ["none", "Personne"],
                ] as [TaskFilters["assignee"], string][]
              ).map(([value, label]) => (
                <DropdownCheckboxItem
                  key={value}
                  checked={filters.assignee === value}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => setFilters((f) => ({ ...f, assignee: value }))}
                >
                  {label}
                </DropdownCheckboxItem>
              ))}
              <DropdownSeparator />
              <DropdownLabel>Priorité</DropdownLabel>
              {(
                [
                  ["all", "Toutes"],
                  ["high", "Haute"],
                  ["medium", "Normale"],
                  ["low", "Basse"],
                ] as [TaskFilters["priority"], string][]
              ).map(([value, label]) => (
                <DropdownCheckboxItem
                  key={value}
                  checked={filters.priority === value}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => setFilters((f) => ({ ...f, priority: value }))}
                >
                  {label}
                </DropdownCheckboxItem>
              ))}
              <DropdownSeparator />
              <DropdownLabel>Trier par</DropdownLabel>
              {SORTS.map((option) => (
                <DropdownCheckboxItem key={option.value} checked={sort === option.value} onSelect={(e) => e.preventDefault()} onCheckedChange={() => setSort(option.value)}>
                  {option.label}
                </DropdownCheckboxItem>
              ))}
            </DropdownContent>
          </Dropdown>

          {(activeFilterCount > 0 || filters.query) && (
            <Button variant="ghost" onClick={resetFilters}>
              <X /> Réinitialiser
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {doneCount > 0 && (
              <Button variant="ghost" onClick={archiveDone} className="hidden sm:inline-flex">
                <Archive /> Archiver les terminées
              </Button>
            )}
            <Segmented
              label="Affichage"
              value={view}
              onChange={setView}
              options={[
                { value: "board", label: <Columns3 className="size-4" aria-label="Tableau" /> },
                { value: "list", label: <List className="size-4" aria-label="Liste" /> },
              ]}
            />
          </div>
        </div>
        {sort !== "manual" && view === "board" && (
          <p className="text-xs text-muted">Le glisser-déposer est disponible en « Ordre manuel ».</p>
        )}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Rien à faire pour le moment"
          description="Notez ici ce que vous voulez faire ensemble : réservations, recettes, achats, idées…"
          action={
            <Button onClick={() => setEditor({ open: true, task: null })}>
              <Plus /> Nouvelle tâche
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          compact
          icon={Search}
          title="Aucune tâche ne correspond"
          description="Essayez d'autres filtres ou une autre recherche."
          action={
            <Button variant="secondary" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          }
        />
      ) : view === "board" ? (
        <TaskBoard
          tasks={visible}
          categories={categoryMap}
          members={memberMap}
          sortable={sort === "manual"}
          onToggle={toggle}
          onOpen={(task) => setEditor({ open: true, task })}
          onMove={move}
          onAdd={(status) => setEditor({ open: true, task: null, status })}
        />
      ) : (
        <TaskList tasks={visible} categories={categoryMap} members={memberMap} onToggle={toggle} onOpen={(task) => setEditor({ open: true, task })} />
      )}

      <TaskEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        task={editor.task}
        categories={categories}
        defaults={{ status: editor.status ?? "todo", categoryId: filters.categoryId === "all" ? null : filters.categoryId }}
        onSaved={upsert}
        onDeleted={(id) => setTasks((current) => current.filter((t) => t.id !== id))}
      />
    </>
  );
}
