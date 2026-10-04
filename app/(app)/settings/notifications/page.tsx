import type { Metadata } from "next";
import { NotificationSettings } from "@/components/settings/preferences";
import { requireWorkspace } from "@/server/auth/guards";
import { db, sql } from "@/server/db";
import { integrations } from "@/server/env";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationSettingsPage() {
  const ctx = await requireWorkspace();
  const prefs = await db.one<{ emailNotifications: boolean; reminderEmails: boolean; defaultReminderMinutes: number | null }>(sql`
    SELECT email_notifications, reminder_emails, default_reminder_minutes FROM users WHERE id = ${ctx.user.id}`);
  return <NotificationSettings initial={prefs} emailConfigured={integrations.email()} />;
}
