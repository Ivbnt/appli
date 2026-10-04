"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult, FormState } from "@/lib/action-result";
import { notificationsSchema, themeSchema } from "@/lib/validation/account";
import { profileSchema } from "@/lib/validation/auth";
import { requireUser } from "../auth/guards";
import { formatRetryAfter, rateLimit } from "../auth/rate-limit";
import { db, sql } from "../db";
import { fieldErrorsFrom } from "../safe-action";
import { sendEmail } from "../email";
import { testEmail } from "../email/templates";
import { flushFileDeletions, queueFileDeletion } from "../storage";

export async function updateThemeAction(input: { theme: string }): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = themeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thème invalide." };
  await db.exec(sql`UPDATE users SET theme_preference = ${parsed.data.theme} WHERE id = ${session.user.id}`);
  return { ok: true, data: undefined };
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error) };
  await db.exec(sql`UPDATE users SET name = ${parsed.data.name} WHERE id = ${session.user.id}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil mis à jour." };
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

export async function sendTestEmailAction(): Promise<ActionResult<{ delivered: boolean; to: string }>> {
  const session = await requireUser();
  const limit = await rateLimit(`test-email:${session.user.id}`, 5, 60 * 60);
  if (!limit.allowed) return { ok: false, error: `Patientez ${formatRetryAfter(limit.retryAfterSeconds)} avant un nouvel essai.` };
  try {
    const delivery = await sendEmail(testEmail(session.user.email, session.user.name.split(/\s+/)[0] ?? session.user.name));
    return { ok: true, data: { delivered: delivery.delivered, to: session.user.email } };
  } catch (error) {
    console.error("[email] e-mail de test non envoyé", error);
    return { ok: false, error: `L'envoi a échoué : ${error instanceof Error ? error.message : "erreur inconnue"}. Vérifiez la configuration (EMAIL_PROVIDER, SMTP_URL…).` };
  }
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
