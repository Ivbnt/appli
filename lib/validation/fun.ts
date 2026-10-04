import { z } from "zod";
import { CHALLENGE_DIFFICULTY_VALUES, CHALLENGE_STATUS_VALUES } from "@/lib/domain";
import { id, optionalText, requiredText } from "./common";

export const answerSchema = z.object({ questionId: id, value: z.string().min(1).max(200) });
export const whoQuestionSchema = z.object({ prompt: requiredText(200, "Écrivez la question.") });
export const questionIdSchema = z.object({ questionId: id });

export const quizSchema = z.object({ title: requiredText(120, "Donnez un titre au quiz."), description: optionalText(500) });
export const quizIdSchema = z.object({ id });
export const quizQuestionSchema = z.object({
  quizId: id,
  prompt: requiredText(200, "Écrivez la question."),
  options: z
    .array(z.string().trim().min(1, "Option vide.").max(80))
    .min(2, "Au moins deux réponses possibles.")
    .max(6, "Six réponses au maximum.")
    .refine((o) => new Set(o.map((v) => v.toLowerCase())).size === o.length, "Les réponses doivent être différentes."),
});

export const activitySchema = z.object({ label: requiredText(60, "Indiquez une activité."), pool: z.enum(["tonight", "wheel"]) });
export const activityIdSchema = z.object({ id });

export const challengeInputSchema = z.object({
  title: requiredText(160, "Donnez un titre au défi."),
  description: optionalText(2000),
  difficulty: z.enum(CHALLENGE_DIFFICULTY_VALUES),
  duration: optionalText(60),
  reward: optionalText(160),
  status: z.enum(CHALLENGE_STATUS_VALUES),
});
export const createChallengeSchema = challengeInputSchema;
export const updateChallengeSchema = challengeInputSchema.extend({ id });
export const challengeIdSchema = z.object({ id });
export const challengeStatusSchema = z.object({ id, status: z.enum(CHALLENGE_STATUS_VALUES) });
