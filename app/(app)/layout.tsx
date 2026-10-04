import { AppShell } from "@/components/layout/app-shell";
import { requireWorkspace } from "@/server/auth/guards";
import { fileUrl } from "@/server/storage";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireWorkspace();
  const members = await Promise.all(
    ctx.members.map(async (member) => ({ id: member.id, name: member.name, avatarUrl: await fileUrl(member.avatarKey) })),
  );
  const me = members.find((member) => member.id === ctx.user.id)!;

  return (
    <AppShell
      data={{
        user: {
          id: ctx.user.id,
          name: ctx.user.name,
          email: ctx.user.email,
          avatarUrl: me.avatarUrl,
          themePreference: ctx.user.themePreference,
        },
        workspace: { name: ctx.workspace.name },
        members,
      }}
    >
      {children}
    </AppShell>
  );
}
