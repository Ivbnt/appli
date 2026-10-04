import "server-only";
import { generateToken, hashToken } from "../auth/crypto";
import { hashPassword, verifyPassword } from "../auth/password";
import { invalidateUserSessions } from "../auth/session";
import { db, sql } from "../db";
import { sendEmail } from "../email";
import { passwordResetEmail } from "../email/templates";
import { NotFoundError, UserError } from "../errors";

export type AuthTokenType = "password_reset";

const TOKEN_TTL_SECONDS: Record<AuthTokenType, number> = {
  password_reset: 60 * 60,
};

export async function createAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = generateToken();
  await db.tx(async (tx) => {
    // Un seul jeton actif par type : demander un nouveau lien invalide le précédent.
    await tx.exec(sql`DELETE FROM auth_tokens WHERE user_id = ${userId} AND type = ${type} AND used_at IS NULL`);
    await tx.exec(sql`
      INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
      VALUES (${userId}, ${type}, ${hashToken(token)}, now() + make_interval(secs => ${TOKEN_TTL_SECONDS[type]}))`);
  });
  return token;
}

/** Consomme un jeton (usage unique, atomique). Renvoie l'utilisateur concerné ou null. */
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  const row = await db.maybe<{ userId: string }>(sql`
    UPDATE auth_tokens SET used_at = now()
    WHERE token_hash = ${hashToken(token)} AND type = ${type} AND used_at IS NULL AND expires_at > now()
    RETURNING user_id`);
  return row?.userId ?? null;
}

export async function isAuthTokenValid(token: string, type: AuthTokenType): Promise<boolean> {
  const count = await db.count(sql`
    SELECT count(*) FROM auth_tokens
    WHERE token_hash = ${hashToken(token)} AND type = ${type} AND used_at IS NULL AND expires_at > now()`);
  return count === 1;
}

/** Ne révèle jamais si l'adresse correspond à un compte. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.maybe<{ id: string; name: string; email: string; passwordHash: string | null }>(sql`
    SELECT id, name, email, password_hash FROM users WHERE email = ${email}`);
  if (!user) return;
  const token = await createAuthToken(user.id, "password_reset");
  await sendEmail(passwordResetEmail(user.email, user.name, token, { firstTime: !user.passwordHash }));
}

export async function resetPassword(token: string, password: string): Promise<string | null> {
  const userId = await consumeAuthToken(token, "password_reset");
  if (!userId) return null;
  // Recevoir le lien prouve la possession de l'adresse : elle est donc vérifiée.
  await db.exec(sql`
    UPDATE users SET password_hash = ${await hashPassword(password)}, email_verified_at = COALESCE(email_verified_at, now())
    WHERE id = ${userId}`);
  await invalidateUserSessions(userId);
  return userId;
}

async function assertPassword(userId: string, password: string): Promise<void> {
  const user = await db.maybe<{ passwordHash: string | null }>(sql`SELECT password_hash FROM users WHERE id = ${userId}`);
  if (!user) throw new NotFoundError("Compte");
  if (!user.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
    throw new UserError("Mot de passe incorrect.", {
      password: ["Mot de passe incorrect."],
      currentPassword: ["Mot de passe incorrect."],
    });
  }
}

export async function changePassword(userId: string, sessionId: string, current: string, next: string): Promise<void> {
  await assertPassword(userId, current);
  await db.exec(sql`UPDATE users SET password_hash = ${await hashPassword(next)} WHERE id = ${userId}`);
  // Les autres appareils sont déconnectés ; la session actuelle est conservée.
  await invalidateUserSessions(userId, { except: sessionId });
}

export async function updateProfile(userId: string, name: string): Promise<void> {
  await db.exec(sql`UPDATE users SET name = ${name} WHERE id = ${userId}`);
}
