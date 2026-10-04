import { expect, test } from "@playwright/test";
import { ALICE, BRUNO, firstLogin, login, newUserPage, query, resetRateLimits } from "./helpers";

test.beforeAll(resetRateLimits);

test("deux comptes fixes : première connexion, espace commun et données partagées", async ({ browser }) => {
  // ── Alice choisit son mot de passe et arrive directement dans l'espace commun.
  const alice = await newUserPage(browser);
  await firstLogin(alice, ALICE);
  await expect(alice.getByRole("heading", { level: 1 })).toContainText("Alice");

  // ── Elle crée une tâche.
  const title = `Réserver le restaurant ${Date.now()}`;
  await alice.goto("/tasks");
  await alice.getByLabel("Ajouter rapidement une tâche").fill(title);
  await alice.keyboard.press("Enter");
  await expect(alice.getByText(title)).toBeVisible();

  // ── Bruno choisit le sien, puis se reconnecte avec : il voit la même tâche.
  const bruno = await newUserPage(browser);
  await firstLogin(bruno, BRUNO);
  await bruno.context().clearCookies();
  await login(bruno, BRUNO);
  await expect(bruno).toHaveURL(/\/$/);
  await bruno.goto("/tasks");
  await expect(bruno.getByText(title)).toBeVisible();

  // ── Les deux comptes sont dans le même espace, et nulle part ailleurs.
  const rows = await query<{ workspaces: string; members: string }>(
    `SELECT count(DISTINCT m.workspace_id) AS workspaces, count(*) AS members
     FROM workspace_members m JOIN users u ON u.id = m.user_id WHERE u.email = ANY($1)`,
    [[ALICE, BRUNO]],
  );
  expect(rows[0]).toEqual({ workspaces: "1", members: "2" });

  // ── Sans session, les fichiers et l'API sont refusés.
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get("/api/search?q=restaurant")).status()).toBe(401);
});

test("il n'y a pas d'inscription", async ({ page }) => {
  for (const path of ["/register", "/onboarding", "/verify-email"]) {
    const response = await page.goto(path);
    // Les pages n'existent plus : redirection vers la connexion (visiteur) ou 404.
    expect(page.url().includes("/login") || response?.status() === 404).toBe(true);
  }
  await page.goto("/login");
  await expect(page.getByText("Créer un compte")).toHaveCount(0);
});

test("une adresse qui n'est pas dans ACCOUNTS ne peut ni se connecter ni recevoir de lien", async ({ page }) => {
  await page.goto("/forgot-password?first=1");
  await page.getByLabel("Adresse e-mail").fill("inconnu@exemple.fr");
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  // Même réponse que pour un vrai compte : on ne révèle rien…
  await expect(page.getByText("un e-mail vient de lui être envoyé")).toBeVisible();
  // … mais aucun compte n'a été créé.
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
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toContainText("incorrect");
});
