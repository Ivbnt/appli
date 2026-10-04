import type { Metadata } from "next";
import { ProfileForm } from "@/components/settings/account-forms";
import { SettingsSection } from "@/components/settings/settings-nav";
import { requireWorkspace } from "@/server/auth/guards";
import { fileUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Compte" };

export default async function AccountSettingsPage() {
  const ctx = await requireWorkspace();
  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Profil">
        <ProfileForm name={ctx.user.name} avatarUrl={await fileUrl(ctx.user.avatarKey)} />
      </SettingsSection>
      <SettingsSection title="Adresse e-mail" description="Fixée par la configuration de l'application (variable ACCOUNTS).">
        <p className="text-sm font-medium">{ctx.user.email}</p>
      </SettingsSection>
    </div>
  );
}
