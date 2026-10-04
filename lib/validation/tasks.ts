import { z } from "zod";
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "@/lib/domain";
import { id, optionalDateOnly, optionalText, requiredText } from "./common";

export const taskInputSchema = z.object({
  title: requiredText(200, "Donnez un titre à la tâche."),
  description: optionalText(5000),
  categoryId: id.nullable(),
  priority: z.enum(TASK_PRIORITY_VALUES),
  status: z.enum(TASK_STATUS_VALUES),
  dueDate: optionalDateOnly,
  assignedToId: id.nullable(),
});
export type TaskInput = z.input<typeof taskInputSchema>;

export const createTaskSchema = taskInputSchema;
export const updateTaskSchema = taskInputSchema.extend({ id });

export const moveTaskSchema = z.object({
  id,
  status: z.enum(TASK_STATUS_VALUES),
  /** Voisins après le déplacement : le serveur calcule la position. */
  beforeId: id.nullable(),
  afterId: id.nullable(),
});

export const taskIdSchema = z.object({ id });
export const setTaskDoneSchema = z.object({ id, done: z.boolean() });
