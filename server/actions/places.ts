"use server";

import { revalidatePath } from "next/cache";
import { createPlaceSchema, movePlaceSchema, placeIdSchema, updatePlaceSchema } from "@/lib/validation/places";
import { workspaceAction } from "../safe-action";
import { evaluateBadges } from "../services/badges";
import * as places from "../services/places";

const refresh = () => {
  revalidatePath("/map");
  revalidatePath("/");
};

export const createPlaceAction = workspaceAction(createPlaceSchema, async (input, ctx) => {
  const place = await places.createPlace(ctx.workspace.id, ctx.user.id, input);
  if (place.status === "visited") await evaluateBadges(ctx.workspace.id);
  refresh();
  return place;
});

export const updatePlaceAction = workspaceAction(updatePlaceSchema, async ({ id, ...input }, ctx) => {
  const place = await places.updatePlace(ctx.workspace.id, id, input);
  if (place.status === "visited") await evaluateBadges(ctx.workspace.id);
  refresh();
  return place;
});

export const movePlaceAction = workspaceAction(movePlaceSchema, async ({ id, latitude, longitude }, ctx) => {
  await places.movePlace(ctx.workspace.id, id, latitude, longitude);
  refresh();
});

export const deletePlaceAction = workspaceAction(placeIdSchema, async ({ id }, ctx) => {
  await places.deletePlace(ctx.workspace.id, id);
  refresh();
});
