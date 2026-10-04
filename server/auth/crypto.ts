import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "../env";

/** Jeton aléatoire opaque (256 bits), encodé en base64url. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Hash SHA-256 (hex) d'un jeton : seul ce hash est stocké en base. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Clé dérivée de AUTH_SECRET, distincte pour chaque usage. */
function deriveKey(purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", env().AUTH_SECRET, "appli", purpose, 32));
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function sign(value: string, purpose: string): string {
  return createHmac("sha256", deriveKey(`hmac:${purpose}`)).update(value).digest("base64url");
}

export function verifySignature(value: string, signature: string, purpose: string): boolean {
  return safeEqual(sign(value, purpose), signature);
}

/** Chiffrement authentifié AES-256-GCM (jetons OAuth au repos). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("encryption"), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Format chiffré invalide");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey("encryption"), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
