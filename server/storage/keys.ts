import { randomBytes } from "node:crypto";

const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/;

/** Les clés sont toujours générées côté serveur ; cette vérification bloque toute traversée de chemin. */
export function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.includes("..") || key.includes("//") || key.length > 512) {
    throw new Error(`Clé de stockage invalide : ${key}`);
  }
}

const rand = () => randomBytes(9).toString("base64url").replace(/[-_]/g, "x");

export const storageKeys = {
  photo: (workspaceId: string, photoId: string, variant: "original" | "thumb" | "preview", ext: string) =>
    `w/${workspaceId}/photos/${photoId}/${variant}.${ext}`,
  reservationDocument: (workspaceId: string, reservationId: string, ext: string) =>
    `w/${workspaceId}/reservations/${reservationId}/${rand()}.${ext}`,
  tripCover: (workspaceId: string, tripId: string) => `w/${workspaceId}/trips/${tripId}/${rand()}.webp`,
  avatar: (userId: string) => `u/${userId}/avatar-${rand()}.webp`,
};

/** Propriétaire d'une clé : un espace (`w/<id>/…`) ou un utilisateur (`u/<id>/…`). */
export function keyOwner(key: string): { kind: "workspace" | "user"; id: string } | null {
  const [scope, id] = key.split("/");
  if (!id) return null;
  if (scope === "w") return { kind: "workspace", id };
  if (scope === "u") return { kind: "user", id };
  return null;
}
