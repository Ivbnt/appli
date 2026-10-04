"use server";

import { revalidatePath } from "next/cache";
import {
  activityIdSchema,
  activitySchema,
  answerSchema,
  challengeIdSchema,
  challengeStatusSchema,
  createChallengeSchema,
  questionIdSchema,
  quizIdSchema,
  quizQuestionSchema,
  quizSchema,
  updateChallengeSchema,
  whoQuestionSchema,
} from "@/lib/validation/fun";
import { workspaceAction } from "../safe-action";
import { evaluateBadges } from "../services/badges";
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

export const createQuizAction = workspaceAction(quizSchema, async (input, ctx) => {
  const quiz = await fun.createQuiz(ctx.workspace.id, ctx.user.id, input);
  refresh();
  return quiz;
});

export const deleteQuizAction = workspaceAction(quizIdSchema, async ({ id }, ctx) => {
  await fun.deleteQuiz(ctx.workspace.id, id);
  refresh();
});

export const addQuizQuestionAction = workspaceAction(quizQuestionSchema, async (input, ctx) => {
  await fun.addQuizQuestion(ctx.workspace.id, ctx.user.id, input);
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

export const createChallengeAction = workspaceAction(createChallengeSchema, async (input, ctx) => {
  const challenge = await fun.createChallenge(ctx.workspace.id, ctx.user.id, input);
  refresh();
  return challenge;
});

export const updateChallengeAction = workspaceAction(updateChallengeSchema, async ({ id, ...input }, ctx) => {
  const challenge = await fun.updateChallenge(ctx.workspace.id, id, input);
  if (challenge.status === "done") await evaluateBadges(ctx.workspace.id);
  refresh();
  return challenge;
});

export const setChallengeStatusAction = workspaceAction(challengeStatusSchema, async ({ id, status }, ctx) => {
  const challenge = await fun.setChallengeStatus(ctx.workspace.id, id, status);
  if (status === "done") await evaluateBadges(ctx.workspace.id);
  refresh();
  return challenge;
});

export const deleteChallengeAction = workspaceAction(challengeIdSchema, async ({ id }, ctx) => {
  await fun.deleteChallenge(ctx.workspace.id, id);
  refresh();
});
