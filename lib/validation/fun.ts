import { z } from "zod";
import { id, requiredText } from "./common";

export const answerSchema = z.object({ questionId: id, value: z.string().min(1).max(200) });
export const whoQuestionSchema = z.object({ prompt: requiredText(200, "Écrivez la question.") });
export const questionIdSchema = z.object({ questionId: id });

export const activitySchema = z.object({ label: requiredText(60, "Indiquez une activité."), pool: z.enum(["tonight", "wheel"]) });
export const activityIdSchema = z.object({ id });
