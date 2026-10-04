import { z } from "zod";
import { EVENT_TYPE_VALUES, RECURRENCE_VALUES } from "@/lib/domain";
import { dateOnly, id, optionalText, requiredText, timeOfDay } from "./common";

export const eventInputSchema = z
  .object({
    title: requiredText(200, "Donnez un titre à l'événement."),
    description: optionalText(5000),
    type: z.enum(EVENT_TYPE_VALUES),
    allDay: z.boolean(),
    startDay: dateOnly,
    startTime: timeOfDay.nullable(),
    endDay: dateOnly.nullable(),
    endTime: timeOfDay.nullable(),
    location: optionalText(300),
    recurrence: z.enum(RECURRENCE_VALUES),
    reminderMinutes: z.number().int().min(0).max(43200).nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.allDay && !value.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Indiquez une heure." });
    const start = `${value.startDay}T${value.allDay ? "00:00" : value.startTime ?? "00:00"}`;
    const end = value.endDay ? `${value.endDay}T${value.allDay ? "00:00" : value.endTime ?? "23:59"}` : null;
    if (end && end < start) ctx.addIssue({ code: "custom", path: ["endDay"], message: "La fin doit être après le début." });
  });
export type EventInput = z.output<typeof eventInputSchema>;

export const createEventSchema = eventInputSchema;
export const updateEventSchema = z.intersection(eventInputSchema, z.object({ id }));
export const eventIdSchema = z.object({ id });
