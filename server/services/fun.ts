import "server-only";
import type { ActivityPool } from "@/lib/domain";
import { db, sql, type Tx } from "../db";
import { NotFoundError, UserError } from "../errors";
import { installWhoOfUsLibrary } from "./defaults";

// ── « Qui de nous deux ? » ───────────────────────────────────

export type QuestionView = {
  id: string;
  prompt: string;
  /** Thème de la grande liste (null pour une question ajoutée à la main). */
  category: string | null;
  position: number;
  myAnswer: string | null;
  /** Réponse de l'autre membre : révélée seulement une fois que l'on a soi-même répondu. */
  partnerAnswer: string | null;
  partnerAnswered: boolean;
};

async function questionsFor(quizId: string, userId: string): Promise<QuestionView[]> {
  const rows = await db.many<{ id: string; prompt: string; category: string | null; position: number; myAnswer: string | null; partnerAnswer: string | null }>(sql`
    SELECT q.id, q.prompt, q.category, q.position,
           (SELECT value FROM quiz_answers a WHERE a.question_id = q.id AND a.user_id = ${userId}) AS my_answer,
           (SELECT value FROM quiz_answers a WHERE a.question_id = q.id AND a.user_id <> ${userId} LIMIT 1) AS partner_answer
    FROM quiz_questions q WHERE q.quiz_id = ${quizId}
    ORDER BY q.position, q.created_at`);
  return rows.map((row) => ({
    ...row,
    partnerAnswered: row.partnerAnswer !== null,
    partnerAnswer: row.myAnswer !== null ? row.partnerAnswer : null,
  }));
}

/** Vérifie qu'une question appartient bien à un quiz de l'espace courant. */
async function assertQuestion(tx: Tx, workspaceId: string, questionId: string) {
  const question = await tx.maybe<{ id: string; kind: string }>(sql`
    SELECT q.id, z.kind FROM quiz_questions q JOIN quizzes z ON z.id = q.quiz_id
    WHERE q.id = ${questionId} AND z.workspace_id = ${workspaceId}`);
  if (!question) throw new NotFoundError("Question");
  return question;
}

export async function answerQuestion(workspaceId: string, userId: string, memberIds: string[], questionId: string, value: string) {
  await db.tx(async (tx) => {
    const question = await assertQuestion(tx, workspaceId, questionId);
    if (question.kind !== "who_of_us" || !memberIds.includes(value)) throw new UserError("Réponse invalide.");
    await tx.exec(sql`
      INSERT INTO quiz_answers (question_id, user_id, value) VALUES (${questionId}, ${userId}, ${value})
      ON CONFLICT (question_id, user_id) DO UPDATE SET value = EXCLUDED.value`);
  });
}

export async function deleteQuestion(workspaceId: string, questionId: string) {
  const count = await db.exec(sql`
    DELETE FROM quiz_questions q USING quizzes z
    WHERE q.id = ${questionId} AND q.quiz_id = z.id AND z.workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Question");
}

async function whoQuizId(workspaceId: string, userId: string): Promise<string> {
  const existing = await db.maybe<{ id: string }>(sql`
    SELECT id FROM quizzes WHERE workspace_id = ${workspaceId} AND kind = 'who_of_us' ORDER BY created_at LIMIT 1`);
  if (existing) return existing.id;
  const created = await db.one<{ id: string }>(sql`
    INSERT INTO quizzes (workspace_id, kind, title, created_by_id) VALUES (${workspaceId}, 'who_of_us', 'Qui de nous deux ?', ${userId}) RETURNING id`);
  return created.id;
}

export async function getWhoOfUs(workspaceId: string, userId: string) {
  // Espaces créés avant la grande liste : elle est ajoutée à la première visite.
  await db.tx((tx) => installWhoOfUsLibrary(tx, workspaceId, userId));
  return questionsFor(await whoQuizId(workspaceId, userId), userId);
}

export async function addWhoQuestion(workspaceId: string, userId: string, prompt: string) {
  const quizId = await whoQuizId(workspaceId, userId);
  await db.exec(sql`
    INSERT INTO quiz_questions (quiz_id, prompt, position, created_by_id)
    VALUES (${quizId}, ${prompt}, (SELECT COALESCE(max(position), -1) + 1 FROM quiz_questions WHERE quiz_id = ${quizId}), ${userId})`);
}

// ── Activités (tirage au sort et roue) ───────────────────────

export type Activity = { id: string; label: string; pool: ActivityPool; doneCount: number; lastDoneAt: Date | null };

export function listActivities(workspaceId: string, pool: ActivityPool) {
  return db.many<Activity>(sql`
    SELECT id, label, pool, done_count, last_done_at FROM activities
    WHERE workspace_id = ${workspaceId} AND pool = ${pool} ORDER BY created_at`);
}

export async function addActivity(workspaceId: string, label: string, pool: ActivityPool) {
  const count = await db.count(sql`SELECT count(*) FROM activities WHERE workspace_id = ${workspaceId} AND pool = ${pool}`);
  if (count >= 24) throw new UserError("24 activités maximum par liste.");
  return db.one<Activity>(sql`
    INSERT INTO activities (workspace_id, label, pool) VALUES (${workspaceId}, ${label}, ${pool})
    RETURNING id, label, pool, done_count, last_done_at`);
}

export async function deleteActivity(workspaceId: string, activityId: string) {
  const count = await db.exec(sql`DELETE FROM activities WHERE id = ${activityId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Activité");
}

export async function markActivityDone(workspaceId: string, activityId: string) {
  const row = await db.maybe<Activity>(sql`
    UPDATE activities SET done_count = done_count + 1, last_done_at = now()
    WHERE id = ${activityId} AND workspace_id = ${workspaceId}
    RETURNING id, label, pool, done_count, last_done_at`);
  if (!row) throw new NotFoundError("Activité");
  return row;
}
