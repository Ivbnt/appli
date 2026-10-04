import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PlaylistView } from "@/components/playlist/playlist-view";
import { requireWorkspace } from "@/server/auth/guards";
import { integrations } from "@/server/env";
import { getConnection } from "@/server/integrations/spotify";
import { getPlaylist } from "@/server/services/playlist";

export const metadata: Metadata = { title: "Playlist" };

export default async function PlaylistPage() {
  const ctx = await requireWorkspace();
  const [playlist, connection] = await Promise.all([getPlaylist(ctx.workspace.id), getConnection(ctx.workspace.id)]);
  return (
    <PageContainer>
      <PageHeader title="Playlist" description="La bande-son de votre histoire." />
      <Suspense>
        <PlaylistView
          playlist={playlist}
          apiConfigured={integrations.spotify()}
          connection={connection ? { displayName: connection.displayName } : null}
        />
      </Suspense>
    </PageContainer>
  );
}
