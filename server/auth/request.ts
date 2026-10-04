import "server-only";
import { headers } from "next/headers";

/** Adresse IP du client (derrière un reverse proxy, le premier X-Forwarded-For). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function getUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent")?.slice(0, 300) ?? null;
}

/**
 * N'accepte que des chemins relatifs internes pour les redirections post-connexion
 * (évite les open redirects du type `//evil.com` ou `https://evil.com`).
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("\n") || value.includes("\r")) return fallback;
  return value;
}
