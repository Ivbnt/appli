import type { Browser, Page } from "@playwright/test";
import pg from "pg";

/** Comptes et mot de passe des tests : transmis au serveur de test (voir playwright.config.ts). */
export const E2E_ACCOUNTS = process.env.E2E_ACCOUNTS ?? "Alice Martin <alice@exemple.fr>, Bruno Petit <bruno@exemple.fr>";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "mot-de-passe-e2e";
export const [ALICE, BRUNO] = E2E_ACCOUNTS.split(",").map((entry) => /<([^>]+)>/.exec(entry)![1]!.toLowerCase());

let client: pg.Client | null = null;

/** Accès direct à la base de test, pour vérifier l'état de la base. */
export async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []) {
  if (!client) {
    client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
  }
  return (await client.query<T>(text, values)).rows;
}

/** Les tests se connectent souvent depuis la même IP : on repart de compteurs vides. */
export async function resetRateLimits() {
  await query("DELETE FROM rate_limits");
}

export async function login(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function newUserPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}
