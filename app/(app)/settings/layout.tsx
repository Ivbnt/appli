import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <PageContainer>
      <PageHeader title="Paramètres" description="Votre compte, votre espace et vos préférences." className="mb-6 sm:mb-8" />
      <div className="grid gap-6 md:grid-cols-[200px_1fr] md:gap-10">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </PageContainer>
  );
}
