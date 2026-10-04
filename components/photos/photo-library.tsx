"use client";

import { FolderInput, ImagePlus, Images, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { deletePhotosAction, movePhotosAction, setAlbumCoverAction } from "@/server/actions/photos";
import { AlbumPicker } from "./album-picker";
import { Lightbox } from "./lightbox";
import { PhotoGrid } from "./photo-grid";
import type { Album, Photo, PhotoLinks } from "./types";
import { DropOverlay, IMAGE_ACCEPT, UploadPanel, useDropzone, usePhotoUploader } from "./use-uploader";

/**
 * Photothèque : grille par mois, défilement infini, import (bouton ou glisser-déposer),
 * sélection multiple, visionneuse plein écran.
 */
export function PhotoLibrary({
  initialPhotos,
  initialCursor,
  links = {},
  albums,
  emptyTitle = "Aucune photo pour le moment",
  emptyDescription = "Importez vos photos préférées : elles restent privées et visibles par vous deux uniquement.",
  toolbarExtra,
}: {
  initialPhotos: Photo[];
  initialCursor: string | null;
  links?: PhotoLinks;
  albums: Album[];
  emptyTitle?: string;
  emptyDescription?: string;
  toolbarExtra?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const [photos, setPhotos] = React.useState(initialPhotos);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [selecting, setSelecting] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [picker, setPicker] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const sentinel = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setPhotos(initialPhotos);
    setCursor(initialCursor);
  }, [initialPhotos, initialCursor]);

  const addPhoto = React.useCallback((photo: Photo) => {
    setPhotos((current) =>
      [photo, ...current.filter((p) => p.id !== photo.id)].sort(
        (a, b) => new Date(b.takenAt ?? b.createdAt).getTime() - new Date(a.takenAt ?? a.createdAt).getTime(),
      ),
    );
  }, []);

  const { uploads, addFiles, clear } = usePhotoUploader(links, addPhoto);
  const dragging = useDropzone(addFiles);

  // Ouverture directe (?photo=…) depuis la recherche, import rapide (?upload=1).
  React.useEffect(() => {
    const photoId = searchParams.get("photo");
    if (photoId) {
      const index = initialPhotos.findIndex((p) => p.id === photoId);
      if (index >= 0) setLightbox(index);
    }
    if (searchParams.get("upload")) fileInput.current?.click();
    if (photoId || searchParams.get("upload")) router.replace(pathname, { scroll: false });
  }, [searchParams, initialPhotos, pathname, router]);

  // Défilement infini.
  React.useEffect(() => {
    if (!cursor || !sentinel.current) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting || loadingMore) return;
        setLoadingMore(true);
        const params = new URLSearchParams({ cursor });
        for (const [key, value] of Object.entries(links)) if (value) params.set(key, value);
        try {
          const response = await fetch(`/api/photos?${params}`);
          const data = (await response.json()) as { photos: Photo[]; nextCursor: string | null };
          setPhotos((current) => [...current, ...data.photos.filter((p) => !current.some((c) => c.id === p.id))]);
          setCursor(data.nextCursor);
        } finally {
          setLoadingMore(false);
        }
      },
      { rootMargin: "800px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, loadingMore, links]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitSelection = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const deleteSelected = async () => {
    const ids = [...selected];
    const ok = await confirm({
      title: `Supprimer ${ids.length} photo${ids.length > 1 ? "s" : ""} ?`,
      description: "Elles seront définitivement supprimées pour vous deux.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    const result = await deletePhotosAction({ ids });
    if (!result.ok) return void toast.error(result.error);
    setPhotos((current) => current.filter((p) => !selected.has(p.id)));
    exitSelection();
    toast.success(`${result.data} photo${result.data > 1 ? "s" : ""} supprimée${result.data > 1 ? "s" : ""}`);
  };

  const moveSelected = async (albumId: string | null) => {
    const ids = [...selected];
    const result = await movePhotosAction({ ids, albumId });
    if (!result.ok) return void toast.error(result.error);
    setPicker(false);
    exitSelection();
    toast.success(albumId ? "Photos ajoutées à l'album" : "Photos retirées de l'album");
    if (links.albumId && albumId !== links.albumId) setPhotos((current) => current.filter((p) => !ids.includes(p.id)));
    router.refresh();
  };

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {selecting ? (
          <>
            <Button variant="ghost" onClick={exitSelection}>
              <X /> Annuler
            </Button>
            <span className="text-sm text-muted tabular">
              {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" disabled={selected.size === 0} onClick={() => setPicker(true)}>
                <FolderInput /> <span className="hidden sm:inline">Album</span>
              </Button>
              <Button variant="danger-ghost" disabled={selected.size === 0} onClick={deleteSelected}>
                <Trash2 /> <span className="hidden sm:inline">Supprimer</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            {toolbarExtra}
            <div className="ml-auto flex gap-2">
              {photos.length > 0 && (
                <Button variant="secondary" onClick={() => setSelecting(true)}>
                  Sélectionner
                </Button>
              )}
              <Button onClick={() => fileInput.current?.click()}>
                <ImagePlus /> Importer
              </Button>
            </div>
          </>
        )}
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => fileInput.current?.click()}>
                <ImagePlus /> Importer des photos
              </Button>
              <span className="hidden text-xs text-subtle sm:block">ou glissez-les directement sur la page</span>
            </div>
          }
        />
      ) : (
        <PhotoGrid photos={photos} onOpen={setLightbox} selectable={selecting} selected={selected} onToggle={toggle} />
      )}

      <div ref={sentinel} className="flex h-16 items-center justify-center">
        {loadingMore && <Spinner className="text-subtle" />}
      </div>

      <Lightbox
        photos={photos}
        index={lightbox}
        onIndexChange={setLightbox}
        onClose={() => setLightbox(null)}
        onUpdated={(photo) => setPhotos((current) => current.map((p) => (p.id === photo.id ? photo : p)))}
        onDeleted={(id) => setPhotos((current) => current.filter((p) => p.id !== id))}
        extraActions={
          links.albumId
            ? (photo) => (
                <button
                  type="button"
                  className="hidden h-10 items-center rounded-full px-3 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white sm:flex"
                  onClick={async () => {
                    const result = await setAlbumCoverAction({ albumId: links.albumId!, photoId: photo.id });
                    if (result.ok) toast.success("Couverture de l'album mise à jour");
                    else toast.error(result.error);
                  }}
                >
                  Définir comme couverture
                </button>
              )
            : undefined
        }
      />

      <AlbumPicker open={picker} onOpenChange={setPicker} albums={albums} currentAlbumId={links.albumId ?? null} onPick={moveSelected} />
      <UploadPanel uploads={uploads} onClose={clear} />
      <DropOverlay visible={dragging} />
    </>
  );
}
