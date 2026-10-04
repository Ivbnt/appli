import "server-only";
import type { TaskPriority, TaskStatus } from "@/lib/domain";
import type { TaskInput } from "@/lib/validation/tasks";
import { db, sql, type Tx } from "../db";
import { NotFoundError, UserError } from "../errors";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  assignedToId: string | null;
  createdById: string | null;
  position: number;
  completedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskCategoryRow = { id: string; name: string; slug: string; position: number };

const TASK_COLUMNS = sql`id, title, description, category_id, priority, status, due_date, assigned_to_id,
  created_by_id, position, completed_at, archived_at, created_at, updated_at`;

export function listCategories(workspaceId: string) {
  return db.many<TaskCategoryRow>(sql`
    SELECT id, name, slug, position FROM task_categories WHERE workspace_id = ${workspaceId} ORDER BY position, name`);
}

export function listActiveTasks(workspaceId: string) {
  return db.many<TaskRow>(sql`
    SELECT ${TASK_COLUMNS} FROM tasks
    WHERE workspace_id = ${workspaceId} AND archived_at IS NULL
    ORDER BY status, position, created_at`);
}

export async function listArchivedTasks(workspaceId: string, { limit = 50, offset = 0 } = {}) {
  const rows = await db.many<TaskRow>(sql`
    SELECT ${TASK_COLUMNS} FROM tasks
    WHERE workspace_id = ${workspaceId} AND archived_at IS NOT NULL
    ORDER BY archived_at DESC LIMIT ${limit + 1} OFFSET ${offset}`);
  return { tasks: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** La personne assignée doit être membre de l'espace. */
async function assertAssignee(tx: Tx, workspaceId: string, userId: string | null) {
  if (!userId) return;
  const ok = await tx.count(sql`
    SELECT count(*) FROM workspace_members WHERE workspace_id = ${workspaceId} AND user_id = ${userId}`);
  if (!ok) throw new UserError("Cette personne ne fait pas partie de l'espace.", { assignedToId: ["Membre inconnu."] });
}

async function assertCategory(tx: Tx, workspaceId: string, categoryId: string | null) {
  if (!categoryId) return;
  const ok = await tx.count(sql`SELECT count(*) FROM task_categories WHERE workspace_id = ${workspaceId} AND id = ${categoryId}`);
  if (!ok) throw new UserError("Catégorie inconnue.", { categoryId: ["Catégorie inconnue."] });
}

async function nextPosition(tx: Tx, workspaceId: string, status: TaskStatus): Promise<number> {
  const row = await tx.one<{ min: number | null }>(sql`
    SELECT min(position) AS min FROM tasks WHERE workspace_id = ${workspaceId} AND status = ${status} AND archived_at IS NULL`);
  // Les nouvelles tâches apparaissent en haut de la colonne.
  return (row.min ?? 1024) - 1024;
}

export async function createTask(workspaceId: string, userId: string, input: TaskInput & { status: TaskStatus }) {
  return db.tx(async (tx) => {
    await assertCategory(tx, workspaceId, input.categoryId ?? null);
    await assertAssignee(tx, workspaceId, input.assignedToId ?? null);
    const position = await nextPosition(tx, workspaceId, input.status);
    return tx.one<TaskRow>(sql`
      INSERT INTO tasks (workspace_id, title, description, category_id, priority, status, due_date, assigned_to_id,
                         created_by_id, position, completed_at)
      VALUES (${workspaceId}, ${input.title}, ${input.description ?? null}, ${input.categoryId ?? null}, ${input.priority},
              ${input.status}, ${input.dueDate ?? null}, ${input.assignedToId ?? null}, ${userId}, ${position},
              ${input.status === "done" ? new Date() : null})
      RETURNING ${TASK_COLUMNS}`);
  });
}

export async function updateTask(workspaceId: string, taskId: string, input: TaskInput & { status: TaskStatus }) {
  return db.tx(async (tx) => {
    await assertCategory(tx, workspaceId, input.categoryId ?? null);
    await assertAssignee(tx, workspaceId, input.assignedToId ?? null);
    const row = await tx.maybe<TaskRow>(sql`
      UPDATE tasks SET
        title = ${input.title}, description = ${input.description ?? null}, category_id = ${input.categoryId ?? null},
        priority = ${input.priority}, due_date = ${input.dueDate ?? null}, assigned_to_id = ${input.assignedToId ?? null},
        completed_at = CASE WHEN ${input.status} = 'done' THEN COALESCE(completed_at, now()) ELSE NULL END,
        status = ${input.status}
      WHERE id = ${taskId} AND workspace_id = ${workspaceId}
      RETURNING ${TASK_COLUMNS}`);
    if (!row) throw new NotFoundError("Tâche");
    return row;
  });
}

export async function setTaskDone(workspaceId: string, taskId: string, done: boolean) {
  const row = await db.maybe<TaskRow>(sql`
    UPDATE tasks SET
      status = ${done ? "done" : "todo"},
      completed_at = ${done ? new Date() : null}
    WHERE id = ${taskId} AND workspace_id = ${workspaceId}
    RETURNING ${TASK_COLUMNS}`);
  if (!row) throw new NotFoundError("Tâche");
  return row;
}

/**
 * Déplace une tâche (drag & drop) entre deux voisines. La position est calculée côté
 * serveur à partir des voisines réelles de l'espace : le client ne fournit que des ids.
 */
export async function moveTask(
  workspaceId: string,
  input: { id: string; status: TaskStatus; beforeId: string | null; afterId: string | null },
) {
  return db.tx(async (tx) => {
    const neighbours = await tx.many<{ id: string; position: number }>(sql`
      SELECT id, position FROM tasks
      WHERE workspace_id = ${workspaceId} AND status = ${input.status} AND archived_at IS NULL
        AND id = ANY(${[input.beforeId, input.afterId].filter(Boolean)}::uuid[])
      FOR UPDATE`);
    const before = neighbours.find((n) => n.id === input.beforeId)?.position;
    const after = neighbours.find((n) => n.id === input.afterId)?.position;

    let position: number;
    if (before !== undefined && after !== undefined) position = (before + after) / 2;
    else if (before !== undefined) position = before + 1024;
    else if (after !== undefined) position = after - 1024;
    else position = 0;

    const row = await tx.maybe<TaskRow>(sql`
      UPDATE tasks SET
        position = ${position},
        completed_at = CASE WHEN ${input.status} = 'done' THEN COALESCE(completed_at, now()) ELSE NULL END,
        status = ${input.status}
      WHERE id = ${input.id} AND workspace_id = ${workspaceId}
      RETURNING ${TASK_COLUMNS}`);
    if (!row) throw new NotFoundError("Tâche");

    // Si l'écart devient trop fin, on renumérote la colonne.
    if (before !== undefined && after !== undefined && Math.abs(after - before) < 1e-6) {
      await tx.exec(sql`
        UPDATE tasks t SET position = s.rank * 1024
        FROM (SELECT id, row_number() OVER (ORDER BY position, created_at) AS rank FROM tasks
              WHERE workspace_id = ${workspaceId} AND status = ${input.status} AND archived_at IS NULL) s
        WHERE t.id = s.id`);
    }
    return row;
  });
}

export async function deleteTask(workspaceId: string, taskId: string) {
  const count = await db.exec(sql`DELETE FROM tasks WHERE id = ${taskId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Tâche");
}

export async function setArchived(workspaceId: string, taskId: string, archived: boolean) {
  const count = await db.exec(sql`
    UPDATE tasks SET archived_at = ${archived ? new Date() : null} WHERE id = ${taskId} AND workspace_id = ${workspaceId}`);
  if (!count) throw new NotFoundError("Tâche");
}

export async function archiveCompleted(workspaceId: string): Promise<number> {
  return db.exec(sql`
    UPDATE tasks SET archived_at = now() WHERE workspace_id = ${workspaceId} AND status = 'done' AND archived_at IS NULL`);
}
