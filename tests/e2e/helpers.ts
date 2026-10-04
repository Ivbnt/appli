import { createHash, randomBytes } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import pg from "pg";

/** Comptes utilisés par les tests : transmis au serveur de test via ACCOUNTS (voir playwright.config.ts). */
export const E2E_ACCOUNTS = process.env.E2E_ACCOUNTS ?? "Alice Martin <alice@exemple.fr>, Bruno Petit <bruno@exemple.fr>";
export const [ALICE, BRUNO] = E2E_ACCOUNTS.split(",").map((entry) => /<([^>]+)>/.exec(entry)![1]!.toLowerCase());

export const PASSWORD = "motdepasse-solide";

let client: pg.Client | null = null;

/** Accès direct à la base de test, uniquement pour simuler la réception d'un e-mail. */
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

/**
 * Équivalent d'un clic sur le lien « Choisir mon mot de passe » reçu par e-mail :
 * le jeton envoyé n'est stocké que haché, on en crée donc un nouveau, connu du test.
 */
export async function passwordLink(email: string) {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
     SELECT id, 'password_reset', $2, now() + interval '1 hour' FROM users WHERE email = $1`,
    [email, createHash("sha256").update(token).digest("hex")],
  );
  return `/reset-password?token=${token}`;
}

/** Première connexion complète : demande du lien, puis choix du mot de passe. */
export async function firstLogin(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("link", { name: "Choisir mon mot de passe" }).click();
  await page.getByRole("heading", { name: "Première connexion" }).waitFor();
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  await page.getByText("un e-mail vient de lui être envoyé").waitFor();

  await page.goto(await passwordLink(email));
  await page.getByLabel("Nouveau mot de passe").fill(PASSWORD);
  await page.getByLabel("Confirmation").fill(PASSWORD);
  await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function newUserPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}
