import "server-only";
import { cookies } from "next/headers";
import { env } from "../env";

const COOKIE = "appli_pending_invite";

/** Mémorise une invitation ouverte avant connexion, pour la proposer après l'inscription. */
export async function rememberPendingInvite(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function readPendingInvite(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value && /^[A-Za-z0-9_-]{20,100}$/.test(value) ? value : null;
}

export async function clearPendingInvite(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
