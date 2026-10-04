import "server-only";
import { db, sql } from "../db";

export type BadgeMetric =
  | "trips"
  | "places_visited"
  | "restaurants"
  | "movies_watched"
  | "activities_done"
  | "recipes_done"
  | "photos"
  | "tasks_done";

export type BadgeProgress = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  metric: BadgeMetric;
  threshold: number;
  value: number;
  awardedAt: Date | null;
};

/** Toutes les métriques des badges, calculées en une seule requête. */
export async function workspaceMetrics(workspaceId: string): Promise<Record<BadgeMetric, number>> {
  return db.one<Record<BadgeMetric, number>>(sql`
    SELECT
      (SELECT count(*) FROM trips WHERE workspace_id = ${workspaceId} AND start_date <= current_date)::int AS trips,
      (SELECT count(*) FROM locations WHERE workspace_id = ${workspaceId} AND status = 'visited')::int AS places_visited,
      (SELECT count(*) FROM locations WHERE workspace_id = ${workspaceId} AND status = 'visited' AND category = 'restaurant')::int AS restaurants,
      (SELECT count(*) FROM movies WHERE workspace_id = ${workspaceId} AND status = 'watched')::int AS movies_watched,
      (
        COALESCE((SELECT sum(done_count) FROM activities WHERE workspace_id = ${workspaceId}), 0)
        + (SELECT count(*) FROM locations WHERE workspace_id = ${workspaceId} AND status = 'visited' AND category = 'activity')
        + (SELECT count(*) FROM tasks t JOIN task_categories c ON c.id = t.category_id
           WHERE t.workspace_id = ${workspaceId} AND t.status = 'done' AND c.slug = 'activities')
      )::int AS activities_done,
      (SELECT count(*) FROM tasks t JOIN task_categories c ON c.id = t.category_id
        WHERE t.workspace_id = ${workspaceId} AND t.status = 'done' AND c.slug = 'recipes')::int AS recipes_done,
      (SELECT count(*) FROM photos WHERE workspace_id = ${workspaceId})::int AS photos,
      (SELECT count(*) FROM tasks WHERE workspace_id = ${workspaceId} AND status = 'done')::int AS tasks_done`);
}

/**
 * Attribue les badges nouvellement mérités. Les badges obtenus restent acquis
 * (pas de retrait si une donnée est supprimée ensuite). Renvoie les nouveaux badges.
 */
export async function evaluateBadges(workspaceId: string): Promise<{ name: string }[]> {
  const metrics = await workspaceMetrics(workspaceId);
  const badges = await db.many<{ id: string; name: string; metric: BadgeMetric; threshold: number }>(sql`
    SELECT b.id, b.name, b.metric, b.threshold FROM badges b
    WHERE NOT EXISTS (SELECT 1 FROM user_badges ub WHERE ub.badge_id = b.id AND ub.workspace_id = ${workspaceId})`);
  const earned = badges.filter((badge) => (metrics[badge.metric] ?? 0) >= badge.threshold);
  if (earned.length === 0) return [];
  await db.exec(sql`
    INSERT INTO user_badges (badge_id, workspace_id)
    SELECT unnest(${earned.map((b) => b.id)}::uuid[]), ${workspaceId}::uuid
    ON CONFLICT (workspace_id, badge_id) DO NOTHING`);
  return earned.map((badge) => ({ name: badge.name }));
}

export async function listBadgeProgress(workspaceId: string): Promise<BadgeProgress[]> {
  await evaluateBadges(workspaceId);
  const [metrics, rows] = await Promise.all([
    workspaceMetrics(workspaceId),
    db.many<Omit<BadgeProgress, "value">>(sql`
      SELECT b.id, b.slug, b.name, b.description, b.icon, b.metric, b.threshold, ub.awarded_at
      FROM badges b
      LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.workspace_id = ${workspaceId}
      ORDER BY b.position`),
  ]);
  return rows.map((row) => ({ ...row, value: metrics[row.metric] ?? 0 }));
}
