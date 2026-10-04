import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { db, sql } from "../db";
import type { ThemePreference } from "@/lib/domain";
import { env } from "../env";
import { generateToken, hashToken } from "./crypto";

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_DURATION_MS = 30 * DAY;
const SESSION_RENEW_THRESHOLD_MS = 15 * DAY;
const LAST_SEEN_THROTTLE_MS = 60 * 60 * 1000;

/** Cookie `__Host-` en HTTPS : pas de domaine, chemin `/`, Secure obligatoire. */
export function sessionCookieConfig() {
  const secure = env().APP_URL.startsWith("https://");
  return { name: secure ? "__Host-appli_session" : "appli_session", secure };
}

export const SESSION_COOKIE_NAMES = ["__Host-appli_session", "appli_session"] as const;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  avatarKey: string | null;
  themePreference: ThemePreference;
};

type SessionUserRow = {
  userId: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  avatarKey: string | null;
  themePreference: ThemePreference;
};

export type ValidSession = { id: string; expiresAt: Date; user: SessionUser };

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.exec(sql`
    INSERT INTO sessions (id, user_id, expires_at, user_agent, ip_address)
    VALUES (${hashToken(token)}, ${userId}, ${expiresAt}, ${meta.userAgent ?? null}, ${meta.ipAddress ?? null})`);
  return { token, expiresAt };
}

export async function validateSessionToken(token: string): Promise<ValidSession | null> {
  const id = hashToken(token);
  const session = await db.maybe<{ id: string; expiresAt: Date; lastSeenAt: Date } & SessionUserRow>(sql`
    SELECT s.id, s.expires_at, s.last_seen_at,
           u.id AS user_id, u.name, u.email, u.email_verified_at, u.avatar_key, u.theme_preference
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${id}`);
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await db.exec(sql`DELETE FROM sessions WHERE id = ${id}`);
    return null;
  }

  // Expiration glissante + horodatage d'activité (limité à une écriture par heure).
  const shouldRenew = session.expiresAt.getTime() - now < SESSION_RENEW_THRESHOLD_MS;
  const shouldTouch = now - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS;
  let expiresAt = session.expiresAt;
  if (shouldRenew || shouldTouch) {
    if (shouldRenew) expiresAt = new Date(now + SESSION_DURATION_MS);
    await db.exec(sql`UPDATE sessions SET expires_at = ${expiresAt}, last_seen_at = now() WHERE id = ${id}`);
  }

  return {
    id: session.id,
    expiresAt,
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      emailVerifiedAt: session.emailVerifiedAt,
      avatarKey: session.avatarKey,
      themePreference: session.themePreference,
    },
  };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const { name, secure } = sessionCookieConfig();
  const store = await cookies();
  store.set(name, token, { httpOnly: true, secure, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function clearSessionCookie(): Promise<void> {
  const { name, secure } = sessionCookieConfig();
  const store = await cookies();
  store.set(name, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(sessionCookieConfig().name)?.value ?? null;
}

/** Session courante, mémorisée pour la durée de la requête. */
export const getCurrentSession = cache(async (): Promise<ValidSession | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  return validateSessionToken(token);
});

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.exec(sql`DELETE FROM sessions WHERE id = ${sessionId}`);
}

export async function invalidateUserSessions(userId: string, options: { except?: string } = {}): Promise<void> {
  await db.exec(sql`
    DELETE FROM sessions
    WHERE user_id = ${userId} ${options.except ? sql`AND id <> ${options.except}` : sql.empty}`);
}
