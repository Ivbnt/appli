import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ArchivedTasks } from "@/components/tasks/archived-tasks";
import { buttonVariants } from "@/components/ui/button";
import { TabLinks } from "@/components/ui/tabs";
import { requireWorkspace } from "@/server/auth/guards";
import { listArchivedTasks, listCategories } from "@/server/services/tasks";

export const metadata: Metadata = { title: "Archives des tâches" };

const PAGE_SIZE = 50;

export default async function ArchivedTasksPage({ searchParams }: PageProps<"/tasks/archive">) {
  const ctx = await requireWorkspace();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [{ tasks, hasMore }, categories] = await Promise.all([
    listArchivedTasks(ctx.workspace.id, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    listCategories(ctx.workspace.id),
  ]);

  return (
    <PageContainer>
      <PageHeader title="À faire" description="Les tâches archivées, restaurables à tout moment.">
        <TabLinks
          items={[
            { href: "/tasks", label: "En cours", exact: true },
            { href: "/tasks/archive", label: "Archives" },
          ]}
        />
      </PageHeader>
      <ArchivedTasks tasks={tasks} categories={categories} />
      {(page > 1 || hasMore) && (
        <nav className="mt-6 flex justify-between" aria-label="Pagination">
          {page > 1 ? (
            <Link href={`/tasks/archive?page=${page - 1}`} className={buttonVariants({ variant: "secondary" })}>
              Précédent
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={`/tasks/archive?page=${page + 1}`} className={buttonVariants({ variant: "secondary" })}>
              Suivant
            </Link>
          )}
        </nav>
      )}
    </PageContainer>
  );
}
