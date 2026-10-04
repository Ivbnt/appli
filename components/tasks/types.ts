import type { TaskCategoryRow, TaskRow } from "@/server/services/tasks";

export type Task = TaskRow;
export type TaskCategory = TaskCategoryRow;

export type TaskSort = "manual" | "due" | "priority" | "recent";

export type TaskFilters = {
  query: string;
  categoryId: string | "all";
  assignee: "all" | "me" | "partner" | "none";
  priority: "all" | "high" | "medium" | "low";
};

export const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;
