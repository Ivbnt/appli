import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { TasksView } from "@/components/tasks/tasks-view";
import { TabLinks } from "@/components/ui/tabs";
import { requireWorkspace } from "@/server/auth/guards";
import { listActiveTasks, listCategories } from "@/server/services/tasks";

export const metadata: Metadata = { title: "À faire" };

export default async function TasksPage() {
  const ctx = await requireWorkspace();
  const [tasks, categories] = await Promise.all([listActiveTasks(ctx.workspace.id), listCategories(ctx.workspace.id)]);

  return (
    <PageContainer wide>
      <PageHeader title="À faire" description="Tout ce que vous voulez faire, organiser ou ne pas oublier.">
        <TabLinks
          items={[
            { href: "/tasks", label: "En cours", exact: true },
            { href: "/tasks/archive", label: "Archives" },
          ]}
        />
      </PageHeader>
      <Suspense>
        <TasksView initialTasks={tasks} categories={categories} />
      </Suspense>
    </PageContainer>
  );
}
