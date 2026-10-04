"use server";

import { revalidatePath } from "next/cache";
import {
  albumIdSchema,
  createAlbumSchema,
  createMilestoneSchema,
  milestoneIdSchema,
  movePhotosSchema,
  photoIdsSchema,
  setCoverSchema,
  updateAlbumSchema,
  updateMilestoneSchema,
  updatePhotoSchema,
} from "@/lib/validation/photos";
import { workspaceAction } from "../safe-action";
import * as photos from "../services/photos";

const refresh = () => {
  revalidatePath("/memories", "layout");
  revalidatePath("/");
};

export const updatePhotoAction = workspaceAction(updatePhotoSchema, async ({ id, ...input }, ctx) => {
  const photo = await photos.updatePhoto(ctx.workspace.id, id, input);
  refresh();
  return photo;
});

export const deletePhotosAction = workspaceAction(photoIdsSchema, async ({ ids }, ctx) => {
  const count = await photos.deletePhotos(ctx.workspace.id, ids);
  refresh();
  revalidatePath("/map");
  return count;
});

export const movePhotosAction = workspaceAction(movePhotosSchema, async ({ ids, albumId }, ctx) => {
  const count = await photos.movePhotosToAlbum(ctx.workspace.id, ids, albumId);
  refresh();
  return count;
});

export const createAlbumAction = workspaceAction(createAlbumSchema, async (input, ctx) => {
  const album = await photos.createAlbum(ctx.workspace.id, ctx.user.id, input);
  refresh();
  return album;
});

export const updateAlbumAction = workspaceAction(updateAlbumSchema, async ({ id, ...input }, ctx) => {
  await photos.updateAlbum(ctx.workspace.id, id, input);
  refresh();
});

export const deleteAlbumAction = workspaceAction(albumIdSchema, async ({ id }, ctx) => {
  await photos.deleteAlbum(ctx.workspace.id, id);
  refresh();
});

export const setAlbumCoverAction = workspaceAction(setCoverSchema, async ({ albumId, photoId }, ctx) => {
  await photos.setAlbumCover(ctx.workspace.id, albumId, photoId);
  refresh();
});

export const createMilestoneAction = workspaceAction(createMilestoneSchema, async (input, ctx) => {
  await photos.saveMilestone(ctx.workspace.id, ctx.user.id, input);
  refresh();
});

export const updateMilestoneAction = workspaceAction(updateMilestoneSchema, async (input, ctx) => {
  await photos.saveMilestone(ctx.workspace.id, ctx.user.id, input);
  refresh();
});

export const deleteMilestoneAction = workspaceAction(milestoneIdSchema, async ({ id }, ctx) => {
  await photos.deleteMilestone(ctx.workspace.id, id);
  refresh();
});
