import "server-only";
import { db, sql } from "../db";

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Rate limiting à fenêtre fixe, atomique et persistant (une seule requête PostgreSQL).
 * Suffisant pour une application à faible trafic, sans dépendre de Redis.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const row = await db.one<{ count: number; resetAt: Date }>(sql`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT (key) DO UPDATE SET
      count    = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
    RETURNING count, reset_at`);
  const retryAfterSeconds = Math.max(0, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
  return { allowed: row.count <= limit, remaining: Math.max(0, limit - row.count), retryAfterSeconds };
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.exec(sql`DELETE FROM rate_limits WHERE key = ${key}`);
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return "quelques secondes";
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "une minute" : `${minutes} minutes`;
}
