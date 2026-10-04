"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTaskSchema, moveTaskSchema, setTaskDoneSchema, taskIdSchema, updateTaskSchema } from "@/lib/validation/tasks";
import { workspaceAction } from "../safe-action";
import { evaluateBadges } from "../services/badges";
import { notifyTaskAssigned } from "../services/notifications";
import * as tasks from "../services/tasks";

const refresh = () => {
  revalidatePath("/tasks");
  revalidatePath("/");
};

export const createTaskAction = workspaceAction(createTaskSchema, async (input, ctx) => {
  const task = await tasks.createTask(ctx.workspace.id, ctx.user.id, input);
  notifyTaskAssigned(ctx, task);
  refresh();
  return task;
});

export const updateTaskAction = workspaceAction(updateTaskSchema, async ({ id, ...input }, ctx) => {
  const previous = await tasks.getAssignee(ctx.workspace.id, id);
  const task = await tasks.updateTask(ctx.workspace.id, id, input);
  notifyTaskAssigned(ctx, task, previous);
  if (task.status === "done") await evaluateBadges(ctx.workspace.id);
  refresh();
  return task;
});

export const setTaskDoneAction = workspaceAction(setTaskDoneSchema, async ({ id, done }, ctx) => {
  const task = await tasks.setTaskDone(ctx.workspace.id, id, done);
  if (done) await evaluateBadges(ctx.workspace.id);
  refresh();
  return task;
});

export const moveTaskAction = workspaceAction(moveTaskSchema, async (input, ctx) => {
  const task = await tasks.moveTask(ctx.workspace.id, input);
  if (task.status === "done") await evaluateBadges(ctx.workspace.id);
  refresh();
  return task;
});

export const deleteTaskAction = workspaceAction(taskIdSchema, async ({ id }, ctx) => {
  await tasks.deleteTask(ctx.workspace.id, id);
  refresh();
});

export const archiveTaskAction = workspaceAction(taskIdSchema.extend({ archived: z.boolean() }), async ({ id, archived }, ctx) => {
  await tasks.setArchived(ctx.workspace.id, id, archived);
  refresh();
});

export const archiveCompletedAction = workspaceAction(z.object({}), async (_input, ctx) => {
  const count = await tasks.archiveCompleted(ctx.workspace.id);
  refresh();
  return count;
});
