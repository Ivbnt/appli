import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireWorkspace, type WorkspaceContext } from "./auth/guards";
import { UserError } from "./errors";

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[] | undefined> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export function toActionError(error: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> } {
  unstable_rethrow(error);
  if (error instanceof UserError) {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  console.error("[action] erreur inattendue", error);
  return { ok: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
}

/**
 * Server action authentifiée et rattachée à l'espace courant :
 * 1. vérifie la session et l'appartenance à l'espace (côté serveur) ;
 * 2. valide l'entrée avec Zod ;
 * 3. normalise les erreurs pour l'interface.
 */
export function workspaceAction<S extends z.ZodType, R>(
  schema: S,
  handler: (input: z.output<S>, ctx: WorkspaceContext) => Promise<R>,
) {
  return async (input: z.input<S>): Promise<ActionResult<R>> => {
    try {
      const ctx = await requireWorkspace();
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: "Certains champs sont invalides.", fieldErrors: fieldErrorsFrom(parsed.error) };
      }
      const data = await handler(parsed.data, ctx);
      return { ok: true, data };
    } catch (error) {
      return toActionError(error);
    }
  };
}
