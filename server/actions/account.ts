"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult, FormState } from "@/lib/action-result";
import { notificationsSchema, themeSchema } from "@/lib/validation/account";
import { changeEmailSchema, changePasswordSchema, deleteAccountSchema, profileSchema } from "@/lib/validation/auth";
import { requireUser } from "../auth/guards";
import { formatRetryAfter, rateLimit } from "../auth/rate-limit";
import { clearSessionCookie } from "../auth/session";
import { db, sql } from "../db";
import { fieldErrorsFrom, toActionError } from "../safe-action";
import * as auth from "../services/auth";
import { flushFileDeletions, queueFileDeletion } from "../storage";

export async function updateThemeAction(input: { theme: string }): Promise<ActionResult> {
  const session = await requireUser({ allowUnverified: true });
  const parsed = themeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thème invalide." };
  await db.exec(sql`UPDATE users SET theme_preference = ${parsed.data.theme} WHERE id = ${session.user.id}`);
  return { ok: true, data: undefined };
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error) };
  await auth.updateProfile(session.user.id, parsed.data.name);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil mis à jour." };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const limit = await rateLimit(`change-password:${session.user.id}`, 5, 15 * 60);
  if (!limit.allowed) return { error: `Trop de tentatives. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.` };
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    await auth.changePassword(session.user.id, session.id, parsed.data.currentPassword, parsed.data.password);
  } catch (error) {
    return toActionError(error);
  }
  return { ok: true, message: "Mot de passe modifié. Vos autres appareils ont été déconnectés." };
}

export async function changeEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const limit = await rateLimit(`change-email:${session.user.id}`, 5, 60 * 60);
  if (!limit.allowed) return { error: `Trop de tentatives. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.` };
  const parsed = changeEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error) };
  if (parsed.data.email === session.user.email) return { error: "C'est déjà votre adresse actuelle." };
  try {
    await auth.changeEmail(session.user.id, parsed.data.email, parsed.data.password);
  } catch (error) {
    return toActionError(error);
  }
  redirect("/verify-email");
}

export async function updateNotificationsAction(input: {
  emailNotifications: boolean;
  reminderEmails: boolean;
  defaultReminderMinutes: number | null;
}): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = notificationsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Préférences invalides." };
  await db.exec(sql`
    UPDATE users SET email_notifications = ${parsed.data.emailNotifications},
                     reminder_emails = ${parsed.data.reminderEmails},
                     default_reminder_minutes = ${parsed.data.defaultReminderMinutes}
    WHERE id = ${session.user.id}`);
  revalidatePath("/settings/notifications");
  return { ok: true, data: undefined };
}

export async function removeAvatarAction(): Promise<ActionResult> {
  const session = await requireUser();
  const row = await db.maybe<{ avatarKey: string | null }>(sql`
    UPDATE users u SET avatar_key = NULL FROM (SELECT avatar_key FROM users WHERE id = ${session.user.id}) old
    WHERE u.id = ${session.user.id} RETURNING old.avatar_key`);
  await queueFileDeletion([row?.avatarKey]);
  flushFileDeletions();
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser({ allowUnverified: true });
  const limit = await rateLimit(`delete-account:${session.user.id}`, 5, 15 * 60);
  if (!limit.allowed) return { error: `Trop de tentatives. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.` };
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    await auth.deleteAccount(session.user.id, parsed.data.password);
  } catch (error) {
    return toActionError(error);
  }
  await clearSessionCookie();
  redirect("/login");
}
