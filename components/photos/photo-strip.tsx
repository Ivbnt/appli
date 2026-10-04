"use client";

import { ImagePlus } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Lightbox } from "./lightbox";
import type { Photo, PhotoLinks } from "./types";
import { IMAGE_ACCEPT, UploadPanel, usePhotoUploader } from "./use-uploader";

/** Photos rattachées à un lieu ou un voyage, avec import direct. */
export function PhotoStrip({ links, title = "Photos" }: { links: PhotoLinks; title?: string }) {
  const [loaded, setLoaded] = React.useState<{ key: string; photos: Photo[] } | null>(null);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const key = new URLSearchParams(Object.entries(links).filter(([, v]) => v) as [string, string][]).toString();
  // Photos du lieu ou du voyage courant (null pendant le chargement).
  const photos = loaded?.key === key ? loaded.photos : null;
  const setPhotos = (update: (current: Photo[] | null) => Photo[] | null) =>
    setLoaded((current) => ({ key, photos: update(current?.key === key ? current.photos : null) ?? [] }));

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/photos?${key}`)
      .then((r) => r.json() as Promise<{ photos: Photo[] }>)
      .then((data) => !cancelled && setLoaded({ key, photos: data.photos }))
      .catch(() => !cancelled && setLoaded({ key, photos: [] }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const { uploads, addFiles, clear } = usePhotoUploader(links, (photo) => setPhotos((current) => [photo, ...(current ?? [])]));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {title}
          {photos && photos.length > 0 && <span className="ml-1.5 font-normal text-subtle tabular">{photos.length}</span>}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
          <ImagePlus /> Ajouter
        </Button>
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
      </div>
      {photos === null ? (
        <div className="flex h-20 items-center justify-center">
          <Spinner className="text-subtle" />
        </div>
      ) : photos.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-border-strong/70 px-4 py-6 text-center text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          <ImagePlus className="size-5" strokeWidth={1.5} />
          Ajoutez vos photos de ce moment
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl">
          {photos.slice(0, 9).map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightbox(index)}
              className="relative aspect-square overflow-hidden"
              style={{ backgroundColor: photo.dominantColor ?? undefined }}
              aria-label={photo.description ?? "Ouvrir la photo"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniature privée signée */}
              <img src={photo.thumbUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 hover:scale-105" />
              {index === 8 && photos.length > 9 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">+{photos.length - 9}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <Lightbox
        photos={photos ?? []}
        index={lightbox}
        onIndexChange={setLightbox}
        onClose={() => setLightbox(null)}
        onUpdated={(photo) => setPhotos((current) => current?.map((p) => (p.id === photo.id ? photo : p)) ?? null)}
        onDeleted={(id) => setPhotos((current) => current?.filter((p) => p.id !== id) ?? null)}
      />
      <UploadPanel uploads={uploads} onClose={clear} />
    </div>
  );
}
