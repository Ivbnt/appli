"use server";

import { revalidatePath } from "next/cache";
import { createEventSchema, eventIdSchema, updateEventSchema } from "@/lib/validation/events";
import { workspaceAction } from "../safe-action";
import * as calendar from "../services/calendar";
import { notifyEventCreated } from "../services/notifications";

const refresh = () => {
  revalidatePath("/calendar");
  revalidatePath("/");
};

export const createEventAction = workspaceAction(createEventSchema, async (input, ctx) => {
  const event = await calendar.createEvent(ctx.workspace.id, ctx.user.id, input);
  notifyEventCreated(ctx, event);
  refresh();
  return { id: event.id };
});

export const updateEventAction = workspaceAction(updateEventSchema, async ({ id, ...input }, ctx) => {
  await calendar.updateEvent(ctx.workspace.id, id, input);
  refresh();
});

export const deleteEventAction = workspaceAction(eventIdSchema, async ({ id }, ctx) => {
  await calendar.deleteEvent(ctx.workspace.id, id);
  refresh();
});
