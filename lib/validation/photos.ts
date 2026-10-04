import { z } from "zod";
import { id, optionalText, requiredText } from "./common";

export const updatePhotoSchema = z.object({
  id,
  description: optionalText(1000),
  location: optionalText(200),
  takenAt: z.iso.datetime({ offset: true }).nullable(),
});

export const photoIdsSchema = z.object({ ids: z.array(id).min(1).max(500) });
export const movePhotosSchema = z.object({ ids: z.array(id).min(1).max(500), albumId: id.nullable() });

export const albumInputSchema = z.object({
  title: requiredText(120, "Donnez un titre à l'album."),
  description: optionalText(1000),
});
export const createAlbumSchema = albumInputSchema;
export const updateAlbumSchema = albumInputSchema.extend({ id });
export const albumIdSchema = z.object({ id });
export const setCoverSchema = z.object({ albumId: id, photoId: id });

export const milestoneInputSchema = z.object({
  title: requiredText(160, "Donnez un titre à ce moment."),
  description: optionalText(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  photoId: id.nullable(),
});
export const createMilestoneSchema = milestoneInputSchema;
export const updateMilestoneSchema = milestoneInputSchema.extend({ id });
export const milestoneIdSchema = z.object({ id });
