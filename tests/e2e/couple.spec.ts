import { expect, test } from "@playwright/test";
import { ALICE, BRUNO, login, newUserPage, query, resetRateLimits } from "./helpers";

test.beforeEach(resetRateLimits);

test("deux comptes, un mot de passe commun : espace commun et données partagées", async ({ browser }) => {
  // ── Alice se connecte et arrive directement dans l'espace commun.
  const alice = await newUserPage(browser);
  await login(alice, ALICE);
  await expect(alice).toHaveURL(/\/$/);
  await expect(alice.getByRole("heading", { level: 1 })).toContainText("Alice");

  // ── Elle crée une tâche…
  const title = `Réserver le restaurant ${Date.now()}`;
  await alice.goto("/tasks");
  await alice.getByLabel("Ajouter rapidement une tâche").fill(title);
  await alice.keyboard.press("Enter");
  await expect(alice.getByText(title)).toBeVisible();

  // ── … que Bruno voit en se connectant avec le même mot de passe.
  const bruno = await newUserPage(browser);
  await login(bruno, BRUNO);
  await expect(bruno).toHaveURL(/\/$/);
  await bruno.goto("/tasks");
  await expect(bruno.getByText(title)).toBeVisible();

  const rows = await query<{ workspaces: string; members: string }>(
    `SELECT count(DISTINCT m.workspace_id) AS workspaces, count(*) AS members
     FROM workspace_members m JOIN users u ON u.id = m.user_id WHERE u.email = ANY($1)`,
    [[ALICE, BRUNO]],
  );
  expect(rows[0]).toEqual({ workspaces: "1", members: "2" });

  // ── Sans session, l'API est refusée.
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get("/api/search?q=restaurant")).status()).toBe(401);
});

test("il n'y a ni inscription ni mot de passe oublié", async ({ page }) => {
  for (const path of ["/register", "/onboarding", "/verify-email", "/forgot-password", "/reset-password"]) {
    const response = await page.goto(path);
    expect(page.url().includes("/login") || response?.status() === 404).toBe(true);
  }
  await page.goto("/login");
  await expect(page.getByText("Créer un compte")).toHaveCount(0);
});

test("une adresse absente de ACCOUNTS est refusée, même avec le bon mot de passe", async ({ page }) => {
  await login(page, "inconnu@exemple.fr");
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toBeVisible();
  expect(await query("SELECT 1 FROM users WHERE email = 'inconnu@exemple.fr'")).toHaveLength(0);
});

test("les pages protégées redirigent vers la connexion", async ({ page }) => {
  for (const path of ["/", "/tasks", "/memories", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
});

test("connexion refusée avec un mauvais mot de passe @mobile", async ({ page }) => {
  await login(page, ALICE, "mauvais-mot-de-passe");
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toBeVisible();
});
