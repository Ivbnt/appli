import { z } from "zod";
import { PLACE_CATEGORY_VALUES, PLACE_STATUS_VALUES } from "@/lib/domain";
import { id, optionalDateOnly, optionalText, optionalUrl, requiredText } from "./common";

export const coordinates = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
};

export const placeInputSchema = z.object({
  name: requiredText(160, "Donnez un nom au lieu."),
  address: optionalText(300),
  ...coordinates,
  category: z.enum(PLACE_CATEGORY_VALUES),
  status: z.enum(PLACE_STATUS_VALUES),
  visitedAt: optionalDateOnly,
  rating: z.number().int().min(1).max(5).nullable(),
  notes: optionalText(5000),
  externalUrl: optionalUrl,
  tripId: id.nullable(),
});
export type PlaceInput = z.output<typeof placeInputSchema>;

export const createPlaceSchema = placeInputSchema;
export const updatePlaceSchema = placeInputSchema.extend({ id });
export const movePlaceSchema = z.object({ id, ...coordinates });
export const placeIdSchema = z.object({ id });
