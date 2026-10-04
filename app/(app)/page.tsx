import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PageContainer } from "@/components/layout/page-header";
import { greeting } from "@/lib/dates";
import { requireWorkspace } from "@/server/auth/guards";
import { getDashboard } from "@/server/services/dashboard";

export const metadata: Metadata = { title: "Accueil" };

export default async function HomePage() {
  const ctx = await requireWorkspace();
  const data = await getDashboard(ctx.workspace.id);
  return (
    <PageContainer>
      <DashboardView data={data} greeting={greeting()} name={ctx.user.name} togetherSince={ctx.workspace.togetherSince} />
    </PageContainer>
  );
}
