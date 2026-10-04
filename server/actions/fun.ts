"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activityIdSchema, activitySchema, answerSchema, questionIdSchema, whoQuestionSchema } from "@/lib/validation/fun";
import { workspaceAction } from "../safe-action";
import { evaluateBadges } from "../services/badges";
import { unlockAlma } from "../services/easter-egg";
import * as fun from "../services/fun";

const refresh = () => revalidatePath("/fun", "layout");

export const answerQuestionAction = workspaceAction(answerSchema, async ({ questionId, value }, ctx) => {
  await fun.answerQuestion(ctx.workspace.id, ctx.user.id, ctx.members.map((m) => m.id), questionId, value);
  refresh();
});

export const addWhoQuestionAction = workspaceAction(whoQuestionSchema, async ({ prompt }, ctx) => {
  await fun.addWhoQuestion(ctx.workspace.id, ctx.user.id, prompt);
  refresh();
});

export const deleteQuestionAction = workspaceAction(questionIdSchema, async ({ questionId }, ctx) => {
  await fun.deleteQuestion(ctx.workspace.id, questionId);
  refresh();
});

export const addActivityAction = workspaceAction(activitySchema, async ({ label, pool }, ctx) => {
  const activity = await fun.addActivity(ctx.workspace.id, label, pool);
  refresh();
  return activity;
});

export const deleteActivityAction = workspaceAction(activityIdSchema, async ({ id }, ctx) => {
  await fun.deleteActivity(ctx.workspace.id, id);
  refresh();
});

export const markActivityDoneAction = workspaceAction(activityIdSchema, async ({ id }, ctx) => {
  const activity = await fun.markActivityDone(ctx.workspace.id, id);
  const badges = await evaluateBadges(ctx.workspace.id);
  refresh();
  return { activity, badges };
});

/** Code secret A·L·M·A : la première fois, ajoute la date à l'agenda. */
export const unlockAlmaAction = workspaceAction(z.object({}), async (_input, ctx) => {
  const result = await unlockAlma(ctx.workspace.id, ctx.user.id);
  if (result.added) {
    revalidatePath("/calendar");
    revalidatePath("/");
  }
  return result;
});
