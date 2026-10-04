"use client";

import { FolderPlus, Images, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/dates";
import { useOnChange } from "@/lib/hooks";
import { createAlbumAction, deleteAlbumAction, updateAlbumAction } from "@/server/actions/photos";
import type { Album } from "./types";

function dateRange(album: Album) {
  if (!album.firstAt || !album.lastAt) return null;
  const first = formatDate(album.firstAt, "monthYear");
  const last = formatDate(album.lastAt, "monthYear");
  return first === last ? first : `${first} – ${last}`;
}

export function AlbumForm({
  open,
  onOpenChange,
  album,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  album?: Album | null;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(album?.title ?? "");
  const [description, setDescription] = React.useState(album?.description ?? "");
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  useOnChange(open ? album ?? "new" : null, (key) => {
    if (key === null) return;
    setTitle(album?.title ?? "");
    setDescription(album?.description ?? "");
    setError(undefined);
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = { title, description: description || null };
      const result = album ? await updateAlbumAction({ id: album.id, ...payload }) : await createAlbumAction(payload);
      if (!result.ok) return setError(result.fieldErrors?.title?.[0] ?? result.error);
      onOpenChange(false);
      toast.success(album ? "Album mis à jour" : "Album créé");
      if (!album && result.data) router.push(`/memories/albums/${(result.data as { id: string }).id}`);
      else router.refresh();
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={album ? "Modifier l'album" : "Nouvel album"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="album-form" loading={pending}>
            {album ? "Enregistrer" : "Créer"}
          </Button>
        </>
      }
    >
      <form id="album-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Titre" htmlFor="album-title" error={error}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Été à Lisbonne" autoFocus maxLength={120} />
        </Field>
        <Field label="Description" htmlFor="album-description" optional>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
      </form>
    </Modal>
  );
}

export function AlbumsView({ albums }: { albums: Album[] }) {
  const [creating, setCreating] = React.useState(false);
  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <FolderPlus /> Nouvel album
        </Button>
      </div>
      {albums.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Aucun album"
          description="Regroupez vos photos par voyage, par saison ou par envie."
          action={
            <Button onClick={() => setCreating(true)}>
              <FolderPlus /> Créer un album
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((album) => (
            <li key={album.id}>
              <Link href={`/memories/albums/${album.id}`} className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted shadow-xs ring-1 ring-border"
                  style={{ backgroundColor: album.coverColor ?? undefined }}
                >
                  {album.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- couverture privée signée
                    <img src={album.coverUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      <Images className="size-7 text-subtle" strokeWidth={1.5} />
                    </span>
                  )}
                </div>
                <p className="mt-3 truncate text-sm font-semibold">{album.title}</p>
                <p className="truncate text-xs text-muted">
                  <span className="tabular">{album.photoCount}</span> photo{album.photoCount > 1 ? "s" : ""}
                  {dateRange(album) && ` · ${dateRange(album)}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <AlbumForm open={creating} onOpenChange={setCreating} />
    </>
  );
}

export function AlbumHeaderActions({ album }: { album: Album }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = React.useState(false);

  const remove = async () => {
    const ok = await confirm({
      title: "Supprimer cet album ?",
      description: "Les photos ne sont pas supprimées : elles restent dans votre photothèque.",
      confirmLabel: "Supprimer l'album",
      destructive: true,
    });
    if (!ok) return;
    const result = await deleteAlbumAction({ id: album.id });
    if (!result.ok) return void toast.error(result.error);
    toast.success("Album supprimé");
    router.push("/memories/albums");
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setEditing(true)}>
        <Pencil /> Modifier
      </Button>
      <Button variant="danger-ghost" size="icon" onClick={remove} aria-label="Supprimer l'album">
        <Trash2 />
      </Button>
      <AlbumForm open={editing} onOpenChange={setEditing} album={album} />
    </>
  );
}
