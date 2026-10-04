import "server-only";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { parseAccounts } from "@/lib/accounts";

const booleanish = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .transform((value) => value === "true" || value === "1" || value === "yes");

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET doit contenir au moins 32 caractères (openssl rand -base64 48)"),
    APP_URL: z.url().default("http://localhost:3000"),
    APP_TIMEZONE: z.string().default("Europe/Paris"),
    ACCOUNTS: z
      .string({ error: "ACCOUNTS est requis : les deux comptes autorisés, par exemple « Prénom Nom <adresse@exemple.fr>, … »" })
      .transform((value, ctx) => {
        try {
          return parseAccounts(value);
        } catch (error) {
          ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : String(error) });
          return z.NEVER;
        }
      }),
    APP_PASSWORD: z.string({ error: "APP_PASSWORD est requis : le mot de passe commun aux deux comptes" }).min(1, "APP_PASSWORD ne peut pas être vide"),
    MAX_UPLOAD_MB: z.coerce.number().int().positive().max(200).default(25),

    EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
    EMAIL_API_KEY: optionalString,
    EMAIL_FROM: optionalString,
    SMTP_URL: optionalString,

    SPOTIFY_CLIENT_ID: optionalString,
    SPOTIFY_CLIENT_SECRET: optionalString,

    MOVIE_API_KEY: optionalString,

    MAP_API_KEY: optionalString,
    GEOCODING_USER_AGENT: optionalString,

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./storage"),
    STORAGE_ENDPOINT: optionalString,
    STORAGE_REGION: z.string().default("auto"),
    STORAGE_BUCKET: optionalString,
    STORAGE_ACCESS_KEY: optionalString,
    STORAGE_SECRET_KEY: optionalString,
    STORAGE_FORCE_PATH_STYLE: booleanish.default(true),
  })
  .superRefine((value, ctx) => {
    if (value.STORAGE_DRIVER === "s3") {
      for (const key of ["STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY"] as const) {
        if (!value[key]) {
          ctx.addIssue({ code: "custom", path: [key], message: `${key} est requis avec STORAGE_DRIVER=s3` });
        }
      }
    }
    if (value.EMAIL_PROVIDER === "resend" && !value.EMAIL_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["EMAIL_API_KEY"], message: "EMAIL_API_KEY est requis avec EMAIL_PROVIDER=resend" });
    }
    if (value.EMAIL_PROVIDER === "smtp" && !value.SMTP_URL) {
      ctx.addIssue({ code: "custom", path: ["SMTP_URL"], message: "SMTP_URL est requis avec EMAIL_PROVIDER=smtp" });
    }
    if (value.NODE_ENV === "production" && value.AUTH_SECRET.startsWith("dev-only")) {
      ctx.addIssue({ code: "custom", path: ["AUTH_SECRET"], message: "Générez un AUTH_SECRET unique pour la production" });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Variables d'environnement validées. Évaluées à la première utilisation
 * (et non à l'import) pour que `next build` fonctionne sans secrets.
 */
export function env(): Env {
  if (cached) return cached;
  // Secret fourni sous forme de fichier (secret Docker ou secret généré au premier démarrage).
  if (!process.env.AUTH_SECRET && process.env.AUTH_SECRET_FILE) {
    try {
      process.env.AUTH_SECRET = readFileSync(process.env.AUTH_SECRET_FILE, "utf8").trim();
    } catch {
      // le message de validation ci-dessous explique quoi faire
    }
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration invalide :\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";

export const integrations = {
  spotify: () => Boolean(env().SPOTIFY_CLIENT_ID && env().SPOTIFY_CLIENT_SECRET),
  movies: () => Boolean(env().MOVIE_API_KEY),
  email: () => env().EMAIL_PROVIDER !== "console",
};
