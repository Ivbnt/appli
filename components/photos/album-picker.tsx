"use client";

import { FolderMinus, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createAlbumAction } from "@/server/actions/photos";
import type { Album } from "./types";

export function AlbumPicker({
  open,
  onOpenChange,
  albums,
  currentAlbumId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albums: Album[];
  currentAlbumId: string | null;
  onPick: (albumId: string | null) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createAlbumAction({ title, description: null });
      if (!result.ok) return void toast.error(result.error);
      setTitle("");
      onPick(result.data.id);
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Ajouter à un album" size="sm">
      <div className="flex flex-col gap-1">
        {albums.filter((a) => a.id !== currentAlbumId).map((album) => (
          <button
            key={album.id}
            type="button"
            onClick={() => onPick(album.id)}
            className="flex items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-hover"
          >
            <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-surface-muted" style={{ backgroundColor: album.coverColor ?? undefined }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- couverture privée signée */}
              {album.coverUrl && <img src={album.coverUrl} alt="" className="size-full object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{album.title}</span>
              <span className="text-xs text-muted tabular">{album.photoCount} photo{album.photoCount > 1 ? "s" : ""}</span>
            </span>
          </button>
        ))}
        {currentAlbumId && (
          <button type="button" onClick={() => onPick(null)} className="flex items-center gap-3 rounded-xl p-2 text-left text-sm text-muted transition-colors hover:bg-surface-hover">
            <span className="flex size-11 items-center justify-center rounded-lg bg-surface-muted">
              <FolderMinus className="size-4" />
            </span>
            Retirer de cet album
          </button>
        )}
      </div>
      <form onSubmit={create} className="mt-4 flex gap-2 border-t border-border pt-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nouvel album" aria-label="Titre du nouvel album" maxLength={120} />
        <Button type="submit" variant="secondary" loading={pending} disabled={!title.trim()}>
          <Plus /> Créer
        </Button>
      </form>
    </Modal>
  );
}
