import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { MoviesView } from "@/components/movies/movies-view";
import { requireWorkspace } from "@/server/auth/guards";
import { integrations } from "@/server/env";
import { listMovies, movieStats } from "@/server/services/movies";

export const metadata: Metadata = { title: "Films" };

export default async function MoviesPage() {
  const ctx = await requireWorkspace();
  const [movies, stats] = await Promise.all([listMovies(ctx.workspace.id), movieStats(ctx.workspace.id)]);
  return (
    <PageContainer wide>
      <PageHeader title="Films" description="Ce que vous voulez voir, ce que vous avez aimé." />
      <Suspense>
        <MoviesView initialMovies={movies} stats={stats} apiAvailable={integrations.movies()} />
      </Suspense>
    </PageContainer>
  );
}
