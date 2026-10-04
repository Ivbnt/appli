import "server-only";
import type { ActivityPool, ChallengeDifficulty, ChallengeStatus } from "@/lib/domain";
import { db, sql, type Tx } from "../db";
import { NotFoundError, UserError } from "../errors";

// ── Questions et réponses (quiz & « Qui de nous deux ? ») ───

export type QuestionView = {
  id: string;
  prompt: string;
  options: string[];
  position: number;
  myAnswer: string | null;
  /** Réponse de l'autre membre : révélée seulement une fois que l'on a soi-même répondu. */
  partnerAnswer: string | null;
  partnerAnswered: boolean;
};

async function questionsFor(quizId: string, userId: string): Promise<QuestionView[]> {
  const rows = await db.many<{ id: string; prompt: string; options: string[]; position: number; myAnswer: string | null; partnerAnswer: string | null }>(sql`
    SELECT q.id, q.prompt, q.options, q.position,
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
  const question = await tx.maybe<{ id: string; options: string[]; kind: string }>(sql`
    SELECT q.id, q.options, z.kind FROM quiz_questions q JOIN quizzes z ON z.id = q.quiz_id
    WHERE q.id = ${questionId} AND z.workspace_id = ${workspaceId}`);
  if (!question) throw new NotFoundError("Question");
  return question;
}

export async function answerQuestion(workspaceId: string, userId: string, memberIds: string[], questionId: string, value: string) {
  await db.tx(async (tx) => {
    const question = await assertQuestion(tx, workspaceId, questionId);
    if (question.kind === "who_of_us" && !memberIds.includes(value)) throw new UserError("Réponse invalide.");
    if (question.kind === "couple_quiz" && !question.options.includes(value)) throw new UserError("Réponse invalide.");
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

// « Qui de nous deux ? »

async function whoQuizId(workspaceId: string, userId: string): Promise<string> {
  const existing = await db.maybe<{ id: string }>(sql`
    SELECT id FROM quizzes WHERE workspace_id = ${workspaceId} AND kind = 'who_of_us' ORDER BY created_at LIMIT 1`);
  if (existing) return existing.id;
  const created = await db.one<{ id: string }>(sql`
    INSERT INTO quizzes (workspace_id, kind, title, created_by_id) VALUES (${workspaceId}, 'who_of_us', 'Qui de nous deux ?', ${userId}) RETURNING id`);
  return created.id;
}

export async function getWhoOfUs(workspaceId: string, userId: string) {
  return questionsFor(await whoQuizId(workspaceId, userId), userId);
}

export async function addWhoQuestion(workspaceId: string, userId: string, prompt: string) {
  const quizId = await whoQuizId(workspaceId, userId);
  await db.exec(sql`
    INSERT INTO quiz_questions (quiz_id, prompt, position, created_by_id)
    VALUES (${quizId}, ${prompt}, (SELECT COALESCE(max(position), -1) + 1 FROM quiz_questions WHERE quiz_id = ${quizId}), ${userId})`);
}

// Quiz de couple

export type QuizSummary = {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  myAnswers: number;
  bothAnswered: number;
  matches: number;
};

export async function listQuizzes(workspaceId: string, userId: string): Promise<QuizSummary[]> {
  return db.many<QuizSummary>(sql`
    SELECT z.id, z.title, z.description,
      (SELECT count(*) FROM quiz_questions q WHERE q.quiz_id = z.id)::int AS question_count,
      (SELECT count(*) FROM quiz_questions q JOIN quiz_answers a ON a.question_id = q.id AND a.user_id = ${userId}
        WHERE q.quiz_id = z.id)::int AS my_answers,
      (SELECT count(*) FROM quiz_questions q
        JOIN quiz_answers a ON a.question_id = q.id AND a.user_id = ${userId}
        JOIN quiz_answers b ON b.question_id = q.id AND b.user_id <> ${userId}
        WHERE q.quiz_id = z.id)::int AS both_answered,
      (SELECT count(*) FROM quiz_questions q
        JOIN quiz_answers a ON a.question_id = q.id AND a.user_id = ${userId}
        JOIN quiz_answers b ON b.question_id = q.id AND b.user_id <> ${userId} AND b.value = a.value
        WHERE q.quiz_id = z.id)::int AS matches
    FROM quizzes z WHERE z.workspace_id = ${workspaceId} AND z.kind = 'couple_quiz'
    ORDER BY z.created_at DESC`);
}

export async function getQuiz(workspaceId: string, userId: string, quizId: string) {
  const quiz = await db.maybe<{ id: string; title: string; description: string | null }>(sql`
    SELECT id, title, description FROM quizzes WHERE id = ${quizId} AND workspace_id = ${workspaceId} AND kind = 'couple_quiz'`);
  if (!quiz) return null;
  return { ...quiz, questions: await questionsFor(quiz.id, userId) };
}

export async function createQuiz(workspaceId: string, userId: string, input: { title: string; description: string | null }) {
  return db.one<{ id: string }>(sql`
    INSERT INTO quizzes (workspace_id, kind, title, description, created_by_id)
    VALUES (${workspaceId}, 'couple_quiz', ${input.title}, ${input.description}, ${userId}) RETURNING id`);
}

export async function deleteQuiz(workspaceId: string, quizId: string) {
  const count = await db.exec(sql`DELETE FROM quizzes WHERE id = ${quizId} AND workspace_id = ${workspaceId} AND kind = 'couple_quiz'`);
  if (!count) throw new NotFoundError("Quiz");
}

export async function addQuizQuestion(workspaceId: string, userId: string, input: { quizId: string; prompt: string; options: string[] }) {
  const quiz = await db.maybe<{ id: string }>(sql`SELECT id FROM quizzes WHERE id = ${input.quizId} AND workspace_id = ${workspaceId} AND kind = 'couple_quiz'`);
  if (!quiz) throw new NotFoundError("Quiz");
  await db.exec(sql`
    INSERT INTO quiz_questions (quiz_id, prompt, options, position, created_by_id)
    VALUES (${quiz.id}, ${input.prompt}, ${input.options}::text[],
            (SELECT COALESCE(max(position), -1) + 1 FROM quiz_questions WHERE quiz_id = ${quiz.id}), ${userId})`);
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

// ── Défis ────────────────────────────────────────────────────

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  difficulty: ChallengeDifficulty;
  duration: string | null;
  reward: string | null;
  status: ChallengeStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

const CHALLENGE_COLUMNS = sql`id, title, description, difficulty, duration, reward, status, started_at, completed_at, created_at`;

export function listChallenges(workspaceId: string) {
  return db.many<Challenge>(sql`
    SELECT ${CHALLENGE_COLUMNS} FROM challenges WHERE workspace_id = ${workspaceId}
    ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END, created_at DESC`);
}

type ChallengeInput = { title: string; description: string | null; difficulty: ChallengeDifficulty; duration: string | null; reward: string | null; status: ChallengeStatus };

export async function createChallenge(workspaceId: string, userId: string, input: ChallengeInput) {
  return db.one<Challenge>(sql`
    INSERT INTO challenges (workspace_id, title, description, difficulty, duration, reward, status, started_at, completed_at, created_by_id)
    VALUES (${workspaceId}, ${input.title}, ${input.description}, ${input.difficulty}, ${input.duration}, ${input.reward}, ${input.status},
            ${input.status === "todo" ? null : new Date()}, ${input.status === "done" ? new Date() : null}, ${userId})
    RETURNING ${CHALLENGE_COLUMNS}`);
}

export async function updateChallenge(workspaceId: string, challengeId: string, input: ChallengeInput) {
  const row = await db.maybe<Challenge>(sql`
    UPDATE challenges SET title = ${input.title}, description = ${input.description}, difficulty = ${input.difficulty},
      duration = ${input.duration}, reward = ${input.reward}, status = ${input.status},
      started_at = CASE WHEN ${input.status} = 'todo' THEN NULL ELSE COALESCE(started_at, now()) END,
      completed_at = CASE WHEN ${input.status} = 'done' THEN COALESCE(completed_at, now()) ELSE NULL END
    WHERE id = ${challengeId} AND workspace_id = ${workspaceId}
    RETURNING ${CHALLENGE_COLUMNS}`);
  if (!row) throw new NotFoundError("Défi");
  return row;
}

export async function setChallengeStatus(workspaceId: string, challengeId: string, status: ChallengeStatus) {
  const row = await db.maybe<Challenge>(sql`
    UPDATE challenges SET status = ${status},
      started_at = CASE WHEN ${status} = 'todo' THEN NULL ELSE COALESCE(started_at, now()) END,
      completed_at = CASE WHEN ${status} = 'done' THEN COALESCE(completed_at, now()) ELSE NULL END
    WHERE id = ${challengeId} AND workspace_id = ${workspaceId}
    RETURNING ${CHALLENGE_COLUMNS}`);
  if (!row) throw new NotFoundError("Défi");
  return row;
}

export async function deleteChallenge(workspaceId: string, challengeId: string) {
  const count = await db.exec(sql`DELETE FROM challenges WHERE id = ${challengeId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Défi");
}
