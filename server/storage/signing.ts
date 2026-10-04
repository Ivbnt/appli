import "server-only";
import { sign, verifySignature } from "../auth/crypto";

const PURPOSE = "file-url";
const HOUR = 3600;

/**
 * Expiration arrondie à l'heure : l'URL reste identique pendant une heure,
 * ce qui permet au navigateur de mettre les images en cache.
 */
export function stableExpiry(nowSeconds = Math.floor(Date.now() / 1000)): number {
  return (Math.floor(nowSeconds / HOUR) + 2) * HOUR;
}

function payload(key: string, exp: number, download?: string) {
  return `${key}\n${exp}\n${download ?? ""}`;
}

export function signFileUrl(key: string, download?: string): string {
  const exp = stableExpiry();
  const params = new URLSearchParams({ exp: String(exp), sig: sign(payload(key, exp, download), PURPOSE) });
  if (download) params.set("dl", download);
  return `/api/files/${key}?${params.toString()}`;
}

export function verifyFileUrl(key: string, exp: string | null, sig: string | null, download: string | null): boolean {
  if (!exp || !sig) return false;
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return false;
  return verifySignature(payload(key, expiresAt, download ?? undefined), sig, PURPOSE);
}
