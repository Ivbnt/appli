import "server-only";
import { generateToken, hashToken } from "../auth/crypto";
import { hashPassword, verifyPassword } from "../auth/password";
import { invalidateUserSessions } from "../auth/session";
import { db, isUniqueViolation, sql } from "../db";
import { sendEmail } from "../email";
import { passwordResetEmail, verificationEmail } from "../email/templates";
import { NotFoundError, UserError } from "../errors";
import { flushFileDeletions, queueFileDeletion } from "../storage";
import { collectWorkspaceFileKeys } from "./files";

export type AuthTokenType = "email_verification" | "password_reset";

const TOKEN_TTL_SECONDS: Record<AuthTokenType, number> = {
  email_verification: 24 * 60 * 60,
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

export async function registerUser(input: { name: string; email: string; password: string }) {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await db.one<{ id: string; name: string; email: string }>(sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${input.name}, ${input.email}, ${passwordHash})
      RETURNING id, name, email`);
    await sendVerificationEmail(user.id);
    return user;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new UserError("Un compte existe déjà avec cette adresse.", { email: ["Adresse déjà utilisée."] });
    }
    throw error;
  }
}

export async function sendVerificationEmail(userId: string): Promise<void> {
  const user = await db.maybe<{ name: string; email: string; emailVerifiedAt: Date | null }>(sql`
    SELECT name, email, email_verified_at FROM users WHERE id = ${userId}`);
  if (!user || user.emailVerifiedAt) return;
  const token = await createAuthToken(userId, "email_verification");
  await sendEmail(verificationEmail(user.email, user.name, token));
}

export async function verifyEmailToken(token: string): Promise<string | null> {
  const userId = await consumeAuthToken(token, "email_verification");
  if (!userId) return null;
  await db.exec(sql`UPDATE users SET email_verified_at = now() WHERE id = ${userId}`);
  return userId;
}

/** Ne révèle jamais si l'adresse correspond à un compte. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.maybe<{ id: string; name: string; email: string }>(sql`
    SELECT id, name, email FROM users WHERE email = ${email}`);
  if (!user) return;
  const token = await createAuthToken(user.id, "password_reset");
  await sendEmail(passwordResetEmail(user.email, user.name, token));
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
  const user = await db.maybe<{ passwordHash: string }>(sql`SELECT password_hash FROM users WHERE id = ${userId}`);
  if (!user) throw new NotFoundError("Compte");
  if (!(await verifyPassword(user.passwordHash, password))) {
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

export async function changeEmail(userId: string, email: string, password: string): Promise<void> {
  await assertPassword(userId, password);
  try {
    await db.exec(sql`UPDATE users SET email = ${email}, email_verified_at = NULL WHERE id = ${userId} AND email <> ${email}`);
  } catch (error) {
    if (isUniqueViolation(error)) throw new UserError("Cette adresse est déjà utilisée.", { email: ["Adresse déjà utilisée."] });
    throw error;
  }
  await sendVerificationEmail(userId);
}

export async function updateProfile(userId: string, name: string): Promise<void> {
  await db.exec(sql`UPDATE users SET name = ${name} WHERE id = ${userId}`);
}

/**
 * Suppression de compte (RGPD) : si l'utilisateur est seul dans son espace,
 * l'espace et tous ses fichiers sont supprimés ; sinon les données partagées restent
 * à l'autre membre et l'utilisateur est simplement retiré.
 */
export async function deleteAccount(userId: string, password: string): Promise<void> {
  await assertPassword(userId, password);
  await db.tx(async (tx) => {
    const user = await tx.one<{ avatarKey: string | null; workspaceId: string | null }>(sql`
      SELECT u.avatar_key, m.workspace_id
      FROM users u LEFT JOIN workspace_members m ON m.user_id = u.id
      WHERE u.id = ${userId}
      FOR UPDATE OF u`);
    const keys: (string | null)[] = [user.avatarKey];
    if (user.workspaceId) {
      const members = await tx.count(sql`SELECT count(*) FROM workspace_members WHERE workspace_id = ${user.workspaceId}`);
      if (members <= 1) {
        keys.push(...(await collectWorkspaceFileKeys(tx, user.workspaceId)));
        await tx.exec(sql`DELETE FROM workspaces WHERE id = ${user.workspaceId}`);
      }
    }
    await queueFileDeletion(keys, tx);
    await tx.exec(sql`DELETE FROM users WHERE id = ${userId}`);
  });
  flushFileDeletions();
}
