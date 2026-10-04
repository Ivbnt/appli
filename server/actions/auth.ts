"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/action-result";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { burnPasswordCheck, verifyPassword } from "../auth/password";
import { readPendingInvite, rememberPendingInvite } from "../auth/pending-invite";
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
import { env } from "../env";
import { fieldErrorsFrom, toActionError } from "../safe-action";
import * as auth from "../services/auth";
import { previewInvitation } from "../services/workspace";

const formValues = (formData: FormData, keys: string[]) =>
  Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));

async function startSession(userId: string) {
  const { token, expiresAt } = await createSession(userId, {
    userAgent: await getUserAgent(),
    ipAddress: await getClientIp(),
  });
  await setSessionCookie(token, expiresAt);
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["name", "email"]);
  const ip = await getClientIp();
  const limit = await rateLimit(`register:${ip}`, 10, 60 * 60);
  if (!limit.allowed) {
    return { error: `Trop de tentatives. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.`, values };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error), values };

  const invite = parsed.data.invite || (await readPendingInvite());
  if (env().REGISTRATION_MODE === "invite-only") {
    const preview = invite ? await previewInvitation(invite) : null;
    if (preview?.status !== "valid") {
      return { error: "Les inscriptions se font uniquement sur invitation.", values };
    }
  }

  let userId: string;
  try {
    const user = await auth.registerUser(parsed.data);
    userId = user.id;
  } catch (error) {
    return { ...toActionError(error), values };
  }

  await startSession(userId);
  if (invite) await rememberPendingInvite(invite);
  redirect(invite ? `/invite/${invite}` : "/onboarding");
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

  const user = await db.maybe<{ id: string; passwordHash: string }>(sql`
    SELECT id, password_hash FROM users WHERE email = ${parsed.data.email}`);
  let valid = false;
  if (user) valid = await verifyPassword(user.passwordHash, parsed.data.password);
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
  if (byIp.allowed && byEmail.allowed) {
    try {
      await auth.requestPasswordReset(parsed.data.email);
    } catch (error) {
      console.error("[auth] envoi de l'e-mail de réinitialisation impossible", error);
    }
  }
  // Réponse identique dans tous les cas : on ne révèle pas si un compte existe.
  return {
    ok: true,
    message: "Si un compte est associé à cette adresse, un e-mail vient d'être envoyé avec un lien de réinitialisation.",
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

export async function verifyEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const ip = await getClientIp();
  const limit = await rateLimit(`verify:${ip}`, 20, 60 * 60);
  if (!limit.allowed) return { error: "Trop de tentatives. Réessayez plus tard." };

  const userId = token ? await auth.verifyEmailToken(token) : null;
  if (!userId) return { error: "Ce lien a expiré ou a déjà été utilisé." };

  // Connecte l'utilisateur s'il ouvre le lien sur un autre appareil.
  const session = await getCurrentSession();
  if (!session || session.user.id !== userId) await startSession(userId);

  const invite = await readPendingInvite();
  redirect(invite ? `/invite/${invite}` : "/");
}

export async function resendVerificationAction(_prev: FormState): Promise<FormState> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.user.emailVerifiedAt) redirect("/");
  const limit = await rateLimit(`resend-verification:${session.user.id}`, 3, 15 * 60);
  if (!limit.allowed) {
    return { error: `Patientez ${formatRetryAfter(limit.retryAfterSeconds)} avant de demander un nouveau lien.` };
  }
  try {
    await auth.sendVerificationEmail(session.user.id);
  } catch (error) {
    return toActionError(error);
  }
  return { ok: true, message: "Un nouveau lien vient d'être envoyé." };
}
