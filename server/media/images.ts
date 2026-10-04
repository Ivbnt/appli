import "server-only";
import exifr from "exifr";
import sharp, { type Metadata } from "sharp";
import { fromLocalInput } from "@/lib/dates";
import { UserError } from "../errors";

const ACCEPTED = new Set(["jpeg", "png", "webp", "tiff", "gif", "heif"]);

export type ProcessedImage = {
  original: { buffer: Buffer; ext: string; mime: string };
  thumb: Buffer;
  preview: Buffer;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  takenAt: Date | null;
  latitude: number | null;
  longitude: number | null;
};

const MIME: Record<string, { ext: string; mime: string }> = {
  jpeg: { ext: "jpg", mime: "image/jpeg" },
  png: { ext: "png", mime: "image/png" },
  webp: { ext: "webp", mime: "image/webp" },
  tiff: { ext: "tiff", mime: "image/tiff" },
  gif: { ext: "gif", mime: "image/gif" },
  heif: { ext: "avif", mime: "image/avif" },
};

/**
 * Traite une photo importée :
 * - le format est vérifié à partir du contenu réel (jamais de l'extension ou du type annoncé) ;
 * - l'orientation EXIF est appliquée ;
 * - une miniature carrée (grille) et un aperçu (plein écran) WebP sont générés, sans métadonnées ;
 * - la date de prise de vue et la position GPS sont extraites pour le classement.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    throw new UserError("Ce fichier n'est pas une image lisible.");
  }
  if (!metadata.format || !ACCEPTED.has(metadata.format)) {
    throw new UserError("Format non pris en charge. Utilisez JPEG, PNG, WebP, GIF ou AVIF.");
  }

  const pipeline = () => sharp(input, { failOn: "none", limitInputPixels: 120_000_000 }).rotate();

  const [thumb, preview, stats, exif] = await Promise.all([
    pipeline().resize(480, 480, { fit: "cover", position: "attention" }).webp({ quality: 74 }).toBuffer(),
    pipeline().resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true }),
    pipeline().resize(32, 32, { fit: "cover" }).stats(),
    exifr.parse(input, { pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"], gps: true }).catch(() => null) as Promise<{
      DateTimeOriginal?: Date;
      CreateDate?: Date;
      latitude?: number;
      longitude?: number;
    } | null>,
  ]);

  const { r, g, b } = stats.dominant;
  const takenAt = exif?.DateTimeOriginal ?? exif?.CreateDate ?? null;
  const validDate = takenAt instanceof Date && !Number.isNaN(takenAt.getTime()) && takenAt.getFullYear() > 1900 ? exifLocalTime(takenAt) : null;
  const latitude = typeof exif?.latitude === "number" && Math.abs(exif.latitude) <= 90 ? exif.latitude : null;
  const longitude = typeof exif?.longitude === "number" && Math.abs(exif.longitude) <= 180 ? exif.longitude : null;

  return {
    original: { buffer: input, ...MIME[metadata.format]! },
    thumb,
    preview: preview.data,
    // Orientations EXIF 5 à 8 : l'image est pivotée d'un quart de tour.
    width: (metadata.orientation ?? 1) >= 5 ? (metadata.height ?? null) : (metadata.width ?? null),
    height: (metadata.orientation ?? 1) >= 5 ? (metadata.width ?? null) : (metadata.height ?? null),
    dominantColor: `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`,
    takenAt: validDate,
    latitude,
    longitude,
  };
}

/**
 * Les dates EXIF n'ont pas de fuseau : exifr les lit comme une heure locale du serveur.
 * On les réinterprète comme une heure locale du fuseau de l'application.
 */
function exifLocalTime(date: Date): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  return fromLocalInput(
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  );
}

/** Avatar : carré 256 px, WebP, sans métadonnées. */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(input).metadata();
    if (!metadata.format || !ACCEPTED.has(metadata.format)) throw new Error("format");
  } catch {
    throw new UserError("Choisissez une image JPEG, PNG ou WebP.");
  }
  return sharp(input, { failOn: "none" }).rotate().resize(256, 256, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
}

/** Couverture de voyage : 1600 px de large, WebP. */
export async function processCover(input: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(input).metadata();
    if (!metadata.format || !ACCEPTED.has(metadata.format)) throw new Error("format");
  } catch {
    throw new UserError("Choisissez une image JPEG, PNG ou WebP.");
  }
  return sharp(input, { failOn: "none" }).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
}

/** Les documents PDF sont vérifiés par leur signature binaire. */
export function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}
