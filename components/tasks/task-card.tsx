"use client";

import { CalendarDays, Equal, ChevronsUp, ChevronDown } from "lucide-react";
import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { daysUntil, formatDay, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ShellMember } from "@/components/layout/shell-context";
import type { Task, TaskCategory } from "./types";

export function TaskCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        "before:absolute before:-inset-3 before:content-['']",
        checked ? "border-success bg-success text-white" : "border-border-strong bg-surface hover:border-muted",
      )}
    >
      <svg viewBox="0 0 12 12" className={cn("size-2.5 transition-transform duration-200", checked ? "scale-100" : "scale-0")} aria-hidden="true">
        <path d="M2.5 6.2l2.2 2.2 4.8-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function PriorityIcon({ priority, className }: { priority: Task["priority"]; className?: string }) {
  if (priority === "high") return <ChevronsUp className={cn("size-3.5 text-warning", className)} aria-label="Priorité haute" />;
  if (priority === "low") return <ChevronDown className={cn("size-3.5 text-subtle", className)} aria-label="Priorité basse" />;
  return <Equal className={cn("size-3.5 text-subtle", className)} aria-label="Priorité normale" />;
}

export function DueDate({ day, done }: { day: string; done: boolean }) {
  const diff = daysUntil(day);
  const overdue = !done && diff < 0;
  const soon = !done && diff >= 0 && diff <= 1;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs tabular", overdue ? "text-danger" : soon ? "text-warning" : "text-muted")}
      title={formatDay(day, "long")}
    >
      <CalendarDays className="size-3" aria-hidden="true" />
      {Math.abs(diff) <= 7 ? relativeDay(day) : formatDay(day, "short")}
    </span>
  );
}

type TaskCardProps = {
  task: Task;
  category?: TaskCategory;
  assignee?: ShellMember;
  onDoneChange: (done: boolean) => void;
  onOpen: () => void;
  dragging?: boolean;
  overlay?: boolean;
} & React.ComponentProps<"div">;

export const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard(
  { task, category, assignee, onDoneChange, onOpen, dragging, overlay, className, ...props },
  ref,
) {
  const done = task.status === "done";
  return (
    <div
      ref={ref}
      {...props}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
        props.onKeyDown?.(event);
      }}
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-xl border border-border bg-surface p-3 text-left shadow-xs outline-none",
        "transition-[border-color,box-shadow,opacity] duration-150 hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "opacity-40",
        overlay && "rotate-[1.2deg] cursor-grabbing border-border-strong shadow-lg",
        className,
      )}
    >
      <div className="pt-px">
        <TaskCheckbox checked={done} onChange={onDoneChange} label={done ? "Marquer comme à faire" : "Marquer comme terminée"} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug font-medium break-words", done && "text-subtle line-through decoration-border-strong")}>
          {task.title}
        </p>
        {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{task.description}</p>}
        {(category || task.dueDate || assignee || task.priority !== "medium") && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {task.priority !== "medium" && <PriorityIcon priority={task.priority} />}
            {category && <Badge tone="outline">{category.name}</Badge>}
            {task.dueDate && <DueDate day={task.dueDate} done={done} />}
            {assignee && (
              <span className="ml-auto">
                <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
