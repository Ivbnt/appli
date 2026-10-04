"use client";

import { ChevronLeft, ChevronRight, Download, Info, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import * as React from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";
import { Input, Textarea } from "@/components/ui/input";
import { useMembers } from "@/components/layout/shell-context";
import { formatDate, formatTime } from "@/lib/dates";
import { cn, formatBytes, ucfirst } from "@/lib/utils";
import { deletePhotosAction, updatePhotoAction } from "@/server/actions/photos";
import type { Photo } from "./types";

const iconButton =
  "flex size-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/70";

/** Visionneuse plein écran : navigation clavier et tactile, informations éditables, téléchargement. */
export function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  onUpdated,
  onDeleted,
  extraActions,
}: {
  photos: Photo[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onUpdated: (photo: Photo) => void;
  onDeleted: (id: string) => void;
  extraActions?: (photo: Photo) => React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const confirm = useConfirm();
  const members = useMembers();
  const [showInfo, setShowInfo] = React.useState(false);
  const [direction, setDirection] = React.useState(0);
  const touch = React.useRef<{ x: number; y: number } | null>(null);
  const photo = index !== null ? photos[index] : undefined;

  const go = React.useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = index + delta;
      if (next < 0 || next >= photos.length) return;
      setDirection(delta);
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  React.useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "i") setShowInfo((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  // Préchargement des voisines pour une navigation instantanée.
  React.useEffect(() => {
    if (index === null) return;
    for (const neighbour of [photos[index + 1], photos[index - 1]]) {
      if (neighbour) new window.Image().src = neighbour.previewUrl;
    }
  }, [index, photos]);

  const remove = async () => {
    if (!photo) return;
    if (!(await confirm({ title: "Supprimer cette photo ?", description: "Elle sera définitivement supprimée pour vous deux.", confirmLabel: "Supprimer", destructive: true }))) return;
    const result = await deletePhotosAction({ ids: [photo.id] });
    if (!result.ok) return void toast.error(result.error);
    onDeleted(photo.id);
    toast.success("Photo supprimée");
    if (photos.length <= 1) onClose();
    else if (index !== null && index >= photos.length - 1) onIndexChange(index - 1);
  };

  const save = async (patch: Partial<Pick<Photo, "description" | "location">>) => {
    if (!photo) return;
    const next = { ...photo, ...patch };
    if (next.description === photo.description && next.location === photo.location) return;
    const result = await updatePhotoAction({
      id: photo.id,
      description: next.description,
      location: next.location,
      takenAt: photo.takenAt ? new Date(photo.takenAt).toISOString() : null,
    });
    if (!result.ok) return void toast.error(result.error);
    onUpdated(result.data);
  };

  const when = photo ? photo.takenAt ?? photo.createdAt : null;
  const author = photo?.createdById ? members.find((m) => m.id === photo.createdById)?.name : null;

  return (
    <Dialog.Root open={index !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          className="ui-overlay fixed inset-0 z-[75] flex bg-black text-white outline-none"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // Le focus va au conteneur (navigation clavier immédiate) plutôt qu'au bouton « Fermer ».
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Photo</Dialog.Title>
          <div className="relative flex min-w-0 flex-1 flex-col">
            <header className="pt-safe absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-3 pb-6 sm:px-4">
              <Dialog.Close className={iconButton} aria-label="Fermer">
                <X className="size-5" />
              </Dialog.Close>
              {when && (
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-sm font-medium">{ucfirst(formatDate(when, "full"))}</p>
                  <p className="truncate text-xs text-white/60">
                    {[photo?.location, formatTime(when)].filter(Boolean).join(" · ")}
                  </p>
                </div>
              )}
              {photo && extraActions?.(photo)}
              {photo && (
                <a href={`/api/photos/${photo.id}/download`} className={iconButton} aria-label="Télécharger l'original">
                  <Download className="size-5" />
                </a>
              )}
              <button type="button" onClick={() => setShowInfo((v) => !v)} className={cn(iconButton, showInfo && "bg-white/15")} aria-label="Informations" aria-pressed={showInfo}>
                <Info className="size-5" />
              </button>
              <button type="button" onClick={remove} className={iconButton} aria-label="Supprimer">
                <Trash2 className="size-5" />
              </button>
            </header>

            <div
              className="relative flex flex-1 touch-pan-y items-center justify-center overflow-hidden select-none"
              onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
              onPointerUp={(e) => {
                if (!touch.current) return;
                const dx = e.clientX - touch.current.x;
                const dy = e.clientY - touch.current.y;
                touch.current = null;
                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
                else if (dy > 120 && Math.abs(dy) > Math.abs(dx)) onClose();
              }}
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                {photo && (
                  <motion.img
                    key={photo.id}
                    src={photo.previewUrl}
                    alt={photo.description ?? "Photo"}
                    custom={direction}
                    initial={reduce ? false : { opacity: 0, x: direction * 40, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    draggable={false}
                    className="max-h-full max-w-full object-contain"
                    style={{ backgroundColor: photo.dominantColor ?? undefined }}
                  />
                )}
              </AnimatePresence>

              {index !== null && index > 0 && (
                <button type="button" onClick={() => go(-1)} className={cn(iconButton, "absolute left-3 hidden bg-black/30 sm:flex")} aria-label="Photo précédente">
                  <ChevronLeft className="size-6" />
                </button>
              )}
              {index !== null && index < photos.length - 1 && (
                <button type="button" onClick={() => go(1)} className={cn(iconButton, "absolute right-3 hidden bg-black/30 sm:flex")} aria-label="Photo suivante">
                  <ChevronRight className="size-6" />
                </button>
              )}
            </div>

            {index !== null && (
              <p className="pb-safe absolute inset-x-0 bottom-3 text-center text-xs text-white/50 tabular">
                {index + 1} / {photos.length}
              </p>
            )}
          </div>

          {photo && showInfo && (
            <aside className="pb-safe absolute inset-x-0 bottom-0 z-20 max-h-[60dvh] overflow-y-auto rounded-t-3xl bg-[oklch(0.2_0.004_285)] p-5 sm:static sm:max-h-none sm:w-[340px] sm:rounded-none sm:border-l sm:border-white/10">
              <h2 className="mb-4 text-sm font-semibold">Informations</h2>
              <div className="flex flex-col gap-4 text-sm">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-white/60">Légende</span>
                  <Textarea
                    key={`d-${photo.id}`}
                    defaultValue={photo.description ?? ""}
                    onBlur={(e) => save({ description: e.target.value.trim() || null })}
                    placeholder="Ajouter une légende…"
                    rows={3}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-white/60">Lieu</span>
                  <Input
                    key={`l-${photo.id}`}
                    defaultValue={photo.location ?? ""}
                    onBlur={(e) => save({ location: e.target.value.trim() || null })}
                    placeholder="Où était-ce ?"
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                  />
                </label>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                  {when && (
                    <>
                      <dt className="text-white/50">{photo.takenAt ? "Prise le" : "Ajoutée le"}</dt>
                      <dd>{formatDate(when, "long")} à {formatTime(when)}</dd>
                    </>
                  )}
                  {photo.width && photo.height && (
                    <>
                      <dt className="text-white/50">Dimensions</dt>
                      <dd className="tabular">{photo.width} × {photo.height}</dd>
                    </>
                  )}
                  <dt className="text-white/50">Fichier</dt>
                  <dd className="truncate">{photo.originalName} · {formatBytes(photo.sizeBytes)}</dd>
                  {author && (
                    <>
                      <dt className="text-white/50">Ajoutée par</dt>
                      <dd>{author}</dd>
                    </>
                  )}
                </dl>
              </div>
            </aside>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
