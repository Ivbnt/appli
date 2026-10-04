import type { Metadata } from "next";
import { CoupleSettings } from "@/components/settings/couple-settings";
import { requireWorkspace } from "@/server/auth/guards";
import { fileUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Couple" };

export default async function CoupleSettingsPage() {
  const ctx = await requireWorkspace();
  const members = await Promise.all(ctx.members.map(async (m) => ({ ...m, avatarUrl: await fileUrl(m.avatarKey) })));
  return (
    <CoupleSettings
      workspace={{ name: ctx.workspace.name, togetherSince: ctx.workspace.togetherSince }}
      members={members.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role, avatarUrl: m.avatarUrl }))}
      currentUserId={ctx.user.id}
    />
  );
}
