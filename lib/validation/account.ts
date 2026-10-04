import { z } from "zod";

export const themeSchema = z.object({ theme: z.enum(["light", "dark", "system"]) });

export const notificationsSchema = z.object({
  emailNotifications: z.boolean(),
  reminderEmails: z.boolean(),
  defaultReminderMinutes: z.number().int().min(0).max(43200).nullable(),
});
