import type { Metadata } from "next";
import { Suspense } from "react";
import { PhotoLibrary } from "@/components/photos/photo-library";
import { requireWorkspace } from "@/server/auth/guards";
import { listAlbums, listPhotos } from "@/server/services/photos";

export const metadata: Metadata = { title: "Souvenirs" };

export default async function MemoriesPage() {
  const ctx = await requireWorkspace();
  const [{ photos, nextCursor }, albums] = await Promise.all([listPhotos(ctx.workspace.id), listAlbums(ctx.workspace.id)]);
  return (
    <Suspense>
      <PhotoLibrary initialPhotos={photos} initialCursor={nextCursor} albums={albums} />
    </Suspense>
  );
}
