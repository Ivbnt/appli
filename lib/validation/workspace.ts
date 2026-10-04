import { z } from "zod";
import { optionalDateOnly } from "./common";

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom à votre espace.").max(60, "60 caractères maximum."),
  togetherSince: optionalDateOnly,
});

export const deleteContentSchema = z.object({
  confirmation: z.literal("EFFACER", { error: "Tapez EFFACER pour confirmer." }),
});
