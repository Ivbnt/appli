import type { Browser, Page } from "@playwright/test";
import pg from "pg";

let client: pg.Client | null = null;

/** Accès direct à la base de test, uniquement pour simuler la réception d'un e-mail. */
export async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []) {
  if (!client) {
    client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
  }
  return (await client.query<T>(text, values)).rows;
}

/** Les tests créent beaucoup de comptes depuis la même IP : on repart de compteurs vides. */
export async function resetRateLimits() {
  await query("DELETE FROM rate_limits");
}

export const uniqueEmail = (name: string) => `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@exemple.fr`;

export async function register(page: Page, name: string, email: string, path = "/register") {
  await page.goto(path);
  await page.getByLabel("Prénom").fill(name);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse-solide");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL((url) => url.pathname !== "/register");
}

/** Équivalent d'un clic sur le lien de l'e-mail de vérification. */
export async function verifyEmail(email: string) {
  await query("UPDATE users SET email_verified_at = now() WHERE email = $1", [email]);
}

export async function newUserPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}
