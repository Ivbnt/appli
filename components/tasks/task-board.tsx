"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import * as React from "react";
import type { ShellMember } from "@/components/layout/shell-context";
import { TASK_STATUSES, TASK_STATUS_VALUES, type TaskStatus } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import type { Task, TaskCategory } from "./types";

type BoardProps = {
  tasks: Task[];
  categories: Map<string, TaskCategory>;
  members: Map<string, ShellMember>;
  sortable: boolean;
  onToggle: (task: Task, done: boolean) => void;
  onOpen: (task: Task) => void;
  onMove: (input: { id: string; status: TaskStatus; beforeId: string | null; afterId: string | null }) => void;
  onAdd: (status: TaskStatus) => void;
};

type Columns = Record<TaskStatus, string[]>;

function toColumns(tasks: Task[]): Columns {
  const columns: Columns = { todo: [], in_progress: [], done: [] };
  for (const task of tasks) columns[task.status].push(task.id);
  return columns;
}

function findColumn(columns: Columns, id: string): TaskStatus | null {
  if ((TASK_STATUS_VALUES as string[]).includes(id)) return id as TaskStatus;
  return TASK_STATUS_VALUES.find((status) => columns[status].includes(id)) ?? null;
}

function SortableTask({ task, disabled, ...props }: { task: Task; disabled: boolean } & Omit<React.ComponentProps<typeof TaskCard>, "task">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled });
  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      {...attributes}
      {...listeners}
      {...props}
    />
  );
}

function Column({ status, count, children, onAdd }: { status: TaskStatus; count: number; children: React.ReactNode; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      aria-label={TASK_STATUSES[status]}
      className="flex w-[85vw] max-w-[360px] shrink-0 snap-start flex-col sm:w-auto sm:max-w-none sm:min-w-0 sm:flex-1"
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          <span
            className={cn(
              "size-2 rounded-full",
              status === "todo" && "bg-border-strong",
              status === "in_progress" && "bg-accent",
              status === "done" && "bg-success",
            )}
            aria-hidden="true"
          />
          {TASK_STATUSES[status]}
          <span className="tabular font-normal text-subtle">{count}</span>
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex size-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label={`Ajouter une tâche « ${TASK_STATUSES[status]} »`}
        >
          <Plus className="size-4" />
        </button>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[140px] flex-1 flex-col gap-2 rounded-2xl bg-surface-muted/60 p-2 transition-colors duration-150",
          isOver && "bg-surface-muted",
        )}
      >
        {children}
        {count === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border-strong/60 px-4 py-8 text-center text-xs text-subtle">
            Déposez une tâche ici
          </p>
        )}
      </div>
    </section>
  );
}

export function TaskBoard({ tasks, categories, members, sortable, onToggle, onOpen, onMove, onAdd }: BoardProps) {
  const byId = React.useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const [columns, setColumns] = React.useState<Columns>(() => toColumns(tasks));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const origin = React.useRef<TaskStatus | null>(null);

  React.useEffect(() => {
    if (!activeId) setColumns(toColumns(tasks));
  }, [tasks, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    origin.current = findColumn(columns, String(active.id));
  };

  const handleOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findColumn(columns, String(active.id));
    const to = findColumn(columns, String(over.id));
    if (!from || !to || from === to) return;
    setColumns((current) => {
      const fromItems = current[from].filter((id) => id !== active.id);
      const toItems = [...current[to]];
      const overIndex = toItems.indexOf(String(over.id));
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, String(active.id));
      return { ...current, [from]: fromItems, [to]: toItems };
    });
  };

  const handleEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    setActiveId(null);
    if (!over) return setColumns(toColumns(tasks));
    const status = findColumn(columns, id);
    if (!status) return;

    const items = [...columns[status]];
    const oldIndex = items.indexOf(id);
    const overIndex = items.indexOf(String(over.id));
    const newIndex = overIndex >= 0 ? overIndex : items.length - 1;
    items.splice(oldIndex, 1);
    items.splice(newIndex, 0, id);
    setColumns((current) => ({ ...current, [status]: items }));

    const index = items.indexOf(id);
    const unchanged = origin.current === status && oldIndex === index && overIndex === oldIndex;
    if (unchanged) return;
    onMove({ id, status, beforeId: items[index - 1] ?? null, afterId: items[index + 1] ?? null });
  };

  const active = activeId ? byId.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleStart}
      onDragOver={handleOver}
      onDragEnd={handleEnd}
      onDragCancel={() => {
        setActiveId(null);
        setColumns(toColumns(tasks));
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Appuyez sur Espace pour saisir la tâche, utilisez les flèches pour la déplacer, Espace pour la déposer, Échap pour annuler.",
        },
      }}
    >
      <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:overflow-visible sm:px-0">
        {TASK_STATUS_VALUES.map((status) => (
          <Column key={status} status={status} count={columns[status].length} onAdd={() => onAdd(status)}>
            <SortableContext items={columns[status]} strategy={verticalListSortingStrategy}>
              {columns[status].map((id) => {
                const task = byId.get(id);
                if (!task) return null;
                return (
                  <SortableTask
                    key={id}
                    task={task}
                    disabled={!sortable}
                    category={task.categoryId ? categories.get(task.categoryId) : undefined}
                    assignee={task.assignedToId ? members.get(task.assignedToId) : undefined}
                    onDoneChange={(done) => onToggle(task, done)}
                    onOpen={() => onOpen(task)}
                  />
                );
              })}
            </SortableContext>
          </Column>
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {active ? (
          <TaskCard
            task={active}
            overlay
            category={active.categoryId ? categories.get(active.categoryId) : undefined}
            assignee={active.assignedToId ? members.get(active.assignedToId) : undefined}
            onDoneChange={() => undefined}
            onOpen={() => undefined}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
