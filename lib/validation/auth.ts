import { z } from "zod";
import { emailSchema, nameSchema } from "./common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis.").max(200),
  next: z.string().max(500).optional(),
});

export const profileSchema = z.object({ name: nameSchema });
