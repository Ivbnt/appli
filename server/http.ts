import "server-only";
import { NextResponse } from "next/server";
import { UserError } from "./errors";

/** Lit un fichier unique d'une requête multipart, en respectant la taille maximale. */
export async function readUploadedFile(request: Request, maxBytes: number): Promise<{ file: File; buffer: Buffer; form: FormData }> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes + 64 * 1024) throw new UserError(`Fichier trop volumineux (${Math.round(maxBytes / 1024 / 1024)} Mo maximum).`);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new UserError("Envoi invalide.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new UserError("Aucun fichier reçu.");
  if (file.size > maxBytes) throw new UserError(`Fichier trop volumineux (${Math.round(maxBytes / 1024 / 1024)} Mo maximum).`);
  return { file, buffer: Buffer.from(await file.arrayBuffer()), form };
}

export function jsonError(error: unknown) {
  if (error instanceof UserError) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("[api] erreur inattendue", error);
  return NextResponse.json({ error: "Une erreur inattendue est survenue." }, { status: 500 });
}

export const unauthorized = () => NextResponse.json({ error: "Non authentifié" }, { status: 401 });

export function optionalId(value: FormDataEntryValue | string | null): string | null {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}
