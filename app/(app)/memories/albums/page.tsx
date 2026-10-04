import type { Metadata } from "next";
import { AlbumsView } from "@/components/photos/albums-view";
import { requireWorkspace } from "@/server/auth/guards";
import { listAlbums } from "@/server/services/photos";

export const metadata: Metadata = { title: "Albums" };

export default async function AlbumsPage() {
  const ctx = await requireWorkspace();
  return <AlbumsView albums={await listAlbums(ctx.workspace.id)} />;
}
