"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/action-result";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { burnPasswordCheck, verifyPassword } from "../auth/password";
import { formatRetryAfter, rateLimit, resetRateLimit } from "../auth/rate-limit";
import { getClientIp, getUserAgent, safeRedirectPath } from "../auth/request";
import {
  clearSessionCookie,
  createSession,
  getCurrentSession,
  invalidateSession,
  setSessionCookie,
} from "../auth/session";
import { db, sql } from "../db";
import { fieldErrorsFrom } from "../safe-action";
import { ensureAccountsOnce, isConfiguredEmail } from "../services/accounts";
import * as auth from "../services/auth";

const formValues = (formData: FormData, keys: string[]) =>
  Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));

async function startSession(userId: string) {
  const { token, expiresAt } = await createSession(userId, {
    userAgent: await getUserAgent(),
    ipAddress: await getClientIp(),
  });
  await setSessionCookie(token, expiresAt);
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error), values };

  const ip = await getClientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 30, 15 * 60),
    rateLimit(`login:email:${parsed.data.email}`, 8, 15 * 60),
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    const wait = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return { error: `Trop de tentatives. Réessayez dans ${formatRetryAfter(wait)}.`, values };
  }

  await ensureAccountsOnce();
  const user = isConfiguredEmail(parsed.data.email)
    ? await db.maybe<{ id: string; passwordHash: string | null }>(sql`
        SELECT id, password_hash FROM users WHERE email = ${parsed.data.email}`)
    : null;
  let valid = false;
  if (user?.passwordHash) valid = await verifyPassword(user.passwordHash, parsed.data.password);
  else await burnPasswordCheck(parsed.data.password);
  if (!user || !valid) {
    return { error: "Adresse e-mail ou mot de passe incorrect.", values };
  }

  await resetRateLimit(`login:email:${parsed.data.email}`);
  await startSession(user.id);
  redirect(safeRedirectPath(parsed.data.next, "/"));
}

export async function logoutAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) await invalidateSession(session.id);
  await clearSessionCookie();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Adresse e-mail invalide.", fieldErrors: fieldErrorsFrom(parsed.error), values };

  const ip = await getClientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`forgot:ip:${ip}`, 10, 60 * 60),
    rateLimit(`forgot:email:${parsed.data.email}`, 3, 60 * 60),
  ]);
  if (byIp.allowed && byEmail.allowed && isConfiguredEmail(parsed.data.email)) {
    try {
      await ensureAccountsOnce();
      await auth.requestPasswordReset(parsed.data.email);
    } catch (error) {
      console.error("[auth] envoi de l'e-mail de réinitialisation impossible", error);
    }
  }
  // Réponse identique dans tous les cas : on ne révèle pas si un compte existe.
  return {
    ok: true,
    message: "Si cette adresse correspond à l'un des deux comptes, un e-mail vient de lui être envoyé avec un lien pour choisir le mot de passe.",
    values,
  };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error) };

  const ip = await getClientIp();
  const limit = await rateLimit(`reset:${ip}`, 10, 60 * 60);
  if (!limit.allowed) return { error: `Trop de tentatives. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.` };

  const userId = await auth.resetPassword(parsed.data.token, parsed.data.password);
  if (!userId) return { error: "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau." };

  await startSession(userId);
  redirect("/");
}
