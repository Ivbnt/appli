import { z } from "zod";
import { RESERVATION_TYPE_VALUES } from "@/lib/domain";
import { dateOnly, id, optionalText, optionalUrl, requiredText, timeOfDay } from "./common";

export const tripInputSchema = z
  .object({
    title: requiredText(120, "Donnez un titre au voyage."),
    destination: requiredText(160, "Indiquez la destination."),
    startDate: dateOnly,
    endDate: dateOnly,
    description: optionalText(5000),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "Le retour doit être après le départ." });
export type TripInput = z.output<typeof tripInputSchema>;

export const createTripSchema = tripInputSchema;
export const updateTripSchema = z.intersection(tripInputSchema, z.object({ id }));
export const tripIdSchema = z.object({ id });

export const reservationInputSchema = z
  .object({
    title: requiredText(160, "Donnez un titre à la réservation."),
    type: z.enum(RESERVATION_TYPE_VALUES),
    date: dateOnly,
    time: timeOfDay.nullable(),
    endDate: dateOnly.nullable(),
    endTime: timeOfDay.nullable(),
    location: optionalText(300),
    origin: optionalText(120),
    destination: optionalText(120),
    provider: optionalText(120),
    confirmationNumber: optionalText(80),
    price: z.number().min(0).max(99_999_999).nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/, "Devise invalide."),
    url: optionalUrl,
    notes: optionalText(5000),
    tripId: id.nullable(),
    addToCalendar: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && `${v.endDate}T${v.endTime ?? "23:59"}` < `${v.date}T${v.time ?? "00:00"}`) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "La fin doit être après le début." });
    }
  });
export type ReservationInput = z.output<typeof reservationInputSchema>;

export const createReservationSchema = reservationInputSchema;
export const updateReservationSchema = z.intersection(reservationInputSchema, z.object({ id }));
export const reservationIdSchema = z.object({ id });
