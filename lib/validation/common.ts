import { z } from "zod";

export const id = z.string().min(1).max(64);

export const emailSchema = z
  .string({ error: "Adresse e-mail requise." })
  .trim()
  .toLowerCase()
  .max(254, "Adresse e-mail trop longue.")
  .pipe(z.email({ error: "Adresse e-mail invalide." }));

export const passwordSchema = z
  .string({ error: "Mot de passe requis." })
  .min(10, "10 caractères minimum.")
  .max(128, "128 caractères maximum.");

export const nameSchema = z.string().trim().min(1, "Ce champ est requis.").max(60, "60 caractères maximum.");

export const requiredText = (max: number, message = "Ce champ est requis.") =>
  z.string().trim().min(1, message).max(max, `${max} caractères maximum.`);

/** Texte optionnel : chaîne vide → null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .nullish()
    .transform((value) => (value ? value : null));

export const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^https?:\/\//i.test(value), "L'adresse doit commencer par http:// ou https://");

/** Date calendaire au format AAAA-MM-JJ. */
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
export const optionalDateOnly = z
  .union([dateOnly, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : null));

/** Heure HH:mm. */
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide.");
