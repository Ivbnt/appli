import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Paramètres Argon2id recommandés par l'OWASP (19 MiB, 2 itérations, parallélisme 1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Vérification factice lorsque l'utilisateur n'existe pas : le temps de réponse
 * reste comparable et ne révèle pas l'existence d'un compte.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("appli-dummy-password-for-timing");
  await verifyPassword(await dummyHash, password);
}
