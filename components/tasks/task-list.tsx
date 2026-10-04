"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";
import type { ShellMember } from "@/components/layout/shell-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUSES, TASK_STATUS_VALUES } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { DueDate, PriorityIcon, TaskCheckbox } from "./task-card";
import type { Task, TaskCategory } from "./types";

export function TaskList({
  tasks,
  categories,
  members,
  onToggle,
  onOpen,
}: {
  tasks: Task[];
  categories: Map<string, TaskCategory>;
  members: Map<string, ShellMember>;
  onToggle: (task: Task, done: boolean) => void;
  onOpen: (task: Task) => void;
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({ done: true });

  return (
    <div className="flex flex-col gap-6">
      {TASK_STATUS_VALUES.map((status) => {
        const items = tasks.filter((task) => task.status === status);
        if (items.length === 0) return null;
        const isCollapsed = collapsed[status] ?? false;
        return (
          <section key={status} aria-label={TASK_STATUSES[status]}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [status]: !isCollapsed }))}
              className="mb-2 flex items-center gap-1.5 rounded-md px-1 text-[13px] font-semibold"
              aria-expanded={!isCollapsed}
            >
              <ChevronRight className={cn("size-3.5 text-subtle transition-transform", !isCollapsed && "rotate-90")} />
              {TASK_STATUSES[status]}
              <span className="tabular font-normal text-subtle">{items.length}</span>
            </button>
            {!isCollapsed && (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {items.map((task) => {
                  const category = task.categoryId ? categories.get(task.categoryId) : undefined;
                  const assignee = task.assignedToId ? members.get(task.assignedToId) : undefined;
                  const done = task.status === "done";
                  return (
                    <li key={task.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpen(task)}
                        onKeyDown={(e) => e.key === "Enter" && onOpen(task)}
                        className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-surface-hover/60 focus-visible:bg-surface-hover"
                      >
                        <TaskCheckbox checked={done} onChange={(v) => onToggle(task, v)} label={done ? "Marquer comme à faire" : "Marquer comme terminée"} />
                        <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", done && "text-subtle line-through")}>{task.title}</span>
                        <span className="hidden items-center gap-3 sm:flex">
                          {task.priority !== "medium" && <PriorityIcon priority={task.priority} />}
                          {category && <Badge tone="outline">{category.name}</Badge>}
                        </span>
                        {task.dueDate && <DueDate day={task.dueDate} done={done} />}
                        {assignee && <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
