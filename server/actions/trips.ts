"use server";

import { revalidatePath } from "next/cache";
import {
  createReservationSchema,
  createTripSchema,
  reservationIdSchema,
  tripIdSchema,
  updateReservationSchema,
  updateTripSchema,
} from "@/lib/validation/trips";
import { workspaceAction } from "../safe-action";
import { evaluateBadges } from "../services/badges";
import * as trips from "../services/trips";

const refresh = () => {
  revalidatePath("/trips", "layout");
  revalidatePath("/calendar");
  revalidatePath("/");
};

export const createTripAction = workspaceAction(createTripSchema, async (input, ctx) => {
  const trip = await trips.createTrip(ctx.workspace.id, ctx.user.id, input);
  await evaluateBadges(ctx.workspace.id);
  refresh();
  return trip;
});

export const updateTripAction = workspaceAction(updateTripSchema, async ({ id, ...input }, ctx) => {
  await trips.updateTrip(ctx.workspace.id, ctx.user.id, id, input);
  await evaluateBadges(ctx.workspace.id);
  refresh();
});

export const deleteTripAction = workspaceAction(tripIdSchema, async ({ id }, ctx) => {
  await trips.deleteTrip(ctx.workspace.id, id);
  refresh();
});

export const createReservationAction = workspaceAction(createReservationSchema, async (input, ctx) => {
  const reservation = await trips.createReservation(ctx.workspace.id, ctx.user.id, input);
  refresh();
  return reservation;
});

export const updateReservationAction = workspaceAction(updateReservationSchema, async ({ id, ...input }, ctx) => {
  await trips.updateReservation(ctx.workspace.id, ctx.user.id, id, input);
  refresh();
});

export const deleteReservationAction = workspaceAction(reservationIdSchema, async ({ id }, ctx) => {
  await trips.deleteReservation(ctx.workspace.id, id);
  refresh();
});

export const removeReservationDocumentAction = workspaceAction(reservationIdSchema, async ({ id }, ctx) => {
  await trips.removeReservationDocument(ctx.workspace.id, id);
  refresh();
});
