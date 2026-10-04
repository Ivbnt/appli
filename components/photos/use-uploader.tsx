"use client";

import { Check, ChevronDown, ImageUp, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { Photo, PhotoLinks } from "./types";

type Upload = { id: string; name: string; progress: number; status: "queued" | "uploading" | "done" | "error"; error?: string };

const CONCURRENCY = 3;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif", "image/tiff"];

function send(file: File, links: PhotoLinks, onProgress: (p: number) => void): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (links.albumId) form.append("albumId", links.albumId);
    if (links.placeId) form.append("placeId", links.placeId);
    if (links.tripId) form.append("tripId", links.tripId);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { photo?: Photo; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.photo) resolve(data.photo);
        else reject(new Error(data.error ?? "Import impossible."));
      } catch {
        reject(new Error("Import impossible."));
      }
    };
    xhr.onerror = () => reject(new Error("Connexion interrompue."));
    xhr.send(form);
  });
}

/**
 * Import de photos : file d'attente, 3 envois en parallèle, progression par fichier.
 * Chaque photo importée est transmise à `onUploaded` dès qu'elle est prête.
 */
export function usePhotoUploader(links: PhotoLinks, onUploaded: (photo: Photo) => void) {
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const queue = React.useRef<{ id: string; file: File }[]>([]);
  const active = React.useRef(0);
  const linksRef = React.useRef(links);
  const onUploadedRef = React.useRef(onUploaded);
  React.useEffect(() => {
    linksRef.current = links;
    onUploadedRef.current = onUploaded;
  });

  const patch = (id: string, value: Partial<Upload>) => setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...value } : u)));

  const pump = React.useCallback(() => {
    while (active.current < CONCURRENCY && queue.current.length > 0) {
      const next = queue.current.shift()!;
      active.current++;
      patch(next.id, { status: "uploading" });
      send(next.file, linksRef.current, (progress) => patch(next.id, { progress }))
        .then((photo) => {
          patch(next.id, { status: "done", progress: 1 });
          onUploadedRef.current(photo);
        })
        .catch((error: Error) => patch(next.id, { status: "error", error: error.message }))
        .finally(() => {
          active.current--;
          pump();
        });
    }
  }, []);

  const addFiles = React.useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const images = list.filter((f) => ACCEPT.includes(f.type) || /\.(jpe?g|png|webp|gif|avif|heic|heif|tiff?)$/i.test(f.name));
      if (images.length < list.length) toast.error(`${list.length - images.length} fichier(s) ignoré(s) : seules les images sont acceptées.`);
      if (images.length === 0) return;
      const items = images.map((file) => ({ id: crypto.randomUUID(), file }));
      setUploads((current) => [...current.filter((u) => u.status !== "done"), ...items.map(({ id, file }) => ({ id, name: file.name, progress: 0, status: "queued" as const }))]);
      queue.current.push(...items);
      pump();
    },
    [pump],
  );

  const clear = () => setUploads((list) => list.filter((u) => u.status === "uploading" || u.status === "queued"));

  return { uploads, addFiles, clear };
}

/** Panneau de progression des imports (coin inférieur droit). */
export function UploadPanel({ uploads, onClose }: { uploads: Upload[]; onClose: () => void }) {
  const [collapsed, setCollapsed] = React.useState(false);
  if (uploads.length === 0) return null;
  const done = uploads.filter((u) => u.status === "done").length;
  const failed = uploads.filter((u) => u.status === "error").length;
  const running = uploads.some((u) => u.status === "uploading" || u.status === "queued");

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-40 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg md:right-6 md:bottom-6"
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        {running ? <Spinner className="text-muted" /> : <ImageUp className="size-4 text-muted" />}
        <p className="flex-1 text-sm font-medium">
          {running ? `Import en cours… ${done}/${uploads.length}` : `${done} photo${done > 1 ? "s" : ""} importée${done > 1 ? "s" : ""}`}
          {failed > 0 && <span className="text-danger"> · {failed} échec{failed > 1 ? "s" : ""}</span>}
        </p>
        <button type="button" onClick={() => setCollapsed((c) => !c)} className="rounded-md p-1 text-subtle hover:text-foreground" aria-label={collapsed ? "Déplier" : "Replier"}>
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {!running && (
          <button type="button" onClick={onClose} className="rounded-md p-1 text-subtle hover:text-foreground" aria-label="Fermer">
            <X className="size-4" />
          </button>
        )}
      </div>
      {!collapsed && (
        <ul className="max-h-60 overflow-y-auto border-t border-border px-4 py-2">
          {uploads.map((upload) => (
            <li key={upload.id} className="flex items-center gap-3 py-1.5 text-xs">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{upload.name}</span>
                {upload.status === "error" ? (
                  <span className="block truncate text-danger">{upload.error}</span>
                ) : (
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-muted">
                    <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${Math.round(upload.progress * 100)}%` }} />
                  </span>
                )}
              </span>
              {upload.status === "done" && <Check className="size-3.5 text-success" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Zone de dépôt : affiche un voile discret quand des fichiers sont glissés sur la page. */
export function useDropzone(onFiles: (files: FileList) => void) {
  const [dragging, setDragging] = React.useState(false);
  const depth = React.useRef(0);
  const onFilesRef = React.useRef(onFiles);
  React.useEffect(() => {
    onFilesRef.current = onFiles;
  });

  React.useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setDragging(true);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      if (e.dataTransfer?.files.length) onFilesRef.current(e.dataTransfer.files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return dragging;
}

export function DropOverlay({ visible, label = "Déposez vos photos pour les importer" }: { visible: boolean; label?: string }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-accent/60 bg-surface px-12 py-10 shadow-lg">
        <ImageUp className="size-8 text-accent" strokeWidth={1.5} />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

export const IMAGE_ACCEPT = ACCEPT.join(",");
