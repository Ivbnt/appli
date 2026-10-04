"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/action-result";
import { loginSchema } from "@/lib/validation/auth";
import { hashToken, safeEqual } from "../auth/crypto";
import { formatRetryAfter, rateLimit, resetRateLimit } from "../auth/rate-limit";
import { getClientIp, getUserAgent, safeRedirectPath } from "../auth/request";
import { clearSessionCookie, createSession, getCurrentSession, invalidateSession, setSessionCookie } from "../auth/session";
import { db, sql } from "../db";
import { env } from "../env";
import { fieldErrorsFrom } from "../safe-action";
import { ensureAccountsOnce, isConfiguredEmail } from "../services/accounts";

/**
 * Connexion : l'une des deux adresses déclarées dans ACCOUNTS, et le mot de passe
 * commun APP_PASSWORD (défini dans .env).
 */
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error), values };

  const ip = await getClientIp();
  const limit = await rateLimit(`login:ip:${ip}`, 10, 15 * 60);
  if (!limit.allowed) return { error: `Trop de tentatives. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.`, values };

  await ensureAccountsOnce();
  // Comparaison en temps constant (sur les empreintes, de longueur fixe).
  const passwordOk = safeEqual(hashToken(parsed.data.password), hashToken(env().APP_PASSWORD));
  const user =
    passwordOk && isConfiguredEmail(parsed.data.email)
      ? await db.maybe<{ id: string }>(sql`SELECT id FROM users WHERE email = ${parsed.data.email}`)
      : null;
  if (!user) return { error: "Adresse e-mail ou mot de passe incorrect.", values };

  await resetRateLimit(`login:ip:${ip}`);
  const { token, expiresAt } = await createSession(user.id, { userAgent: await getUserAgent(), ipAddress: ip });
  await setSessionCookie(token, expiresAt);
  redirect(safeRedirectPath(parsed.data.next, "/"));
}

export async function logoutAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) await invalidateSession(session.id);
  await clearSessionCookie();
  redirect("/login");
}
