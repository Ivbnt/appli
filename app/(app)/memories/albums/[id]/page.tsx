import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlbumHeaderActions } from "@/components/photos/albums-view";
import { PhotoLibrary } from "@/components/photos/photo-library";
import { requireWorkspace } from "@/server/auth/guards";
import { getAlbum, listAlbums, listPhotos } from "@/server/services/photos";

export const metadata: Metadata = { title: "Album" };

export default async function AlbumPage({ params }: PageProps<"/memories/albums/[id]">) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const album = await getAlbum(ctx.workspace.id, id);
  if (!album) notFound();
  const [{ photos, nextCursor }, albums] = await Promise.all([
    listPhotos(ctx.workspace.id, { albumId: album.id }),
    listAlbums(ctx.workspace.id),
  ]);

  return (
    <div>
      <Link href="/memories/albums" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Albums
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-title">{album.title}</h2>
          {album.description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{album.description}</p>}
        </div>
        <div className="flex gap-2">
          <AlbumHeaderActions album={album} />
        </div>
      </div>
      <Suspense>
        <PhotoLibrary
          initialPhotos={photos}
          initialCursor={nextCursor}
          links={{ albumId: album.id }}
          albums={albums}
          emptyTitle="Cet album est vide"
          emptyDescription="Importez des photos directement ici, ou ajoutez-en depuis la photothèque avec « Sélectionner »."
        />
      </Suspense>
    </div>
  );
}
