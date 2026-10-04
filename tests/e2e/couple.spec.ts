import { expect, test } from "@playwright/test";
import { newUserPage, query, register, resetRateLimits, uniqueEmail, verifyEmail } from "./helpers";

test.beforeAll(resetRateLimits);

test("parcours complet : inscription, espace, invitation, données partagées et étanchéité", async ({ browser }) => {
  // ── Alice crée son compte : la vérification de l'e-mail est obligatoire.
  const alice = await newUserPage(browser);
  const aliceEmail = uniqueEmail("Alice");
  await register(alice, "Alice", aliceEmail);
  await expect(alice).toHaveURL(/verify-email/);
  await expect(alice.getByRole("heading", { name: "Vérifiez votre adresse" })).toBeVisible();
  await alice.goto("/");
  await expect(alice).toHaveURL(/verify-email/);

  await verifyEmail(aliceEmail);
  await alice.goto("/");
  await expect(alice).toHaveURL(/onboarding/);
  await alice.getByLabel("Nom de l'espace").fill("Alice & Bruno");
  await alice.getByRole("button", { name: "Créer notre espace" }).click();
  await expect(alice).toHaveURL(/\/$/);
  await expect(alice.getByRole("heading", { level: 1 })).toContainText("Alice");

  // ── Alice crée une tâche et un lien d'invitation.
  await alice.goto("/tasks");
  await alice.getByLabel("Ajouter rapidement une tâche").fill("Réserver le restaurant");
  await alice.keyboard.press("Enter");
  await expect(alice.getByText("Réserver le restaurant")).toBeVisible();

  await alice.goto("/settings/couple");
  await alice.getByRole("button", { name: "Créer un lien d'invitation" }).click();
  const link = await alice.getByLabel("Lien d'invitation").inputValue();
  expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]{30,}$/);

  // ── Bruno rejoint l'espace avec le lien.
  const bruno = await newUserPage(browser);
  const brunoEmail = uniqueEmail("Bruno");
  await bruno.goto(new URL(link).pathname);
  await expect(bruno.getByRole("heading", { name: /Rejoindre « Alice & Bruno »/ })).toBeVisible();
  await bruno.getByRole("link", { name: "Créer mon compte" }).click();
  await bruno.waitForURL(/\/register\?invite=/);
  await register(bruno, "Bruno", brunoEmail, bruno.url().replace(/^https?:\/\/[^/]+/, ""));
  await verifyEmail(brunoEmail);
  await bruno.goto(new URL(link).pathname);
  await bruno.getByRole("button", { name: "Rejoindre l'espace" }).click();
  await expect(bruno).toHaveURL(/\/$/);

  // ── Les données sont partagées.
  await bruno.goto("/tasks");
  await expect(bruno.getByText("Réserver le restaurant")).toBeVisible();

  // ── Chloé, d'un autre espace, ne voit rien et ne peut rien ouvrir.
  const chloe = await newUserPage(browser);
  const chloeEmail = uniqueEmail("Chloe");
  await register(chloe, "Chloé", chloeEmail);
  await verifyEmail(chloeEmail);
  await chloe.goto("/onboarding");
  await chloe.getByLabel("Nom de l'espace").fill("Chloé & Dan");
  await chloe.getByRole("button", { name: "Créer notre espace" }).click();
  await expect(chloe).toHaveURL(/\/$/);
  await chloe.goto("/tasks");
  await expect(chloe.getByText("Réserver le restaurant")).toHaveCount(0);

  // Le lien d'invitation déjà utilisé ne fonctionne plus.
  await chloe.goto(new URL(link).pathname);
  await expect(chloe.getByText("Invitation indisponible")).toBeVisible();

  // Une photo de l'espace d'Alice reste inaccessible à Chloé, même avec une URL signée valide.
  await alice.goto("/memories");
  const [upload] = await Promise.all([
    alice.waitForResponse((r) => r.url().endsWith("/api/photos") && r.request().method() === "POST"),
    alice.locator('input[type="file"]').setInputFiles({
      name: "souvenir.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
    }),
  ]);
  const { photo } = (await upload.json()) as { photo: { thumbUrl: string; id: string } };
  expect((await alice.request.get(photo.thumbUrl)).status()).toBe(200);
  expect((await chloe.request.get(photo.thumbUrl)).status()).toBe(403);
  expect((await chloe.request.get(`/api/photos/${photo.id}/download`, { maxRedirects: 0 })).status()).toBe(404);

  // Sans session : refus.
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(photo.thumbUrl)).status()).toBe(401);
  expect((await anonymous.request.get("/api/search?q=restaurant")).status()).toBe(401);

  const [{ count }] = await query<{ count: string }>("SELECT count(*) FROM workspace_members m JOIN users u ON u.id = m.user_id WHERE u.email = ANY($1)", [[aliceEmail, brunoEmail]]);
  expect(Number(count)).toBe(2);
});

test("les pages protégées redirigent vers la connexion", async ({ page }) => {
  for (const path of ["/", "/tasks", "/memories", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
});

test("connexion refusée avec un mauvais mot de passe @mobile", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill("inconnu@exemple.fr");
  await page.getByLabel("Mot de passe", { exact: true }).fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toContainText("incorrect");
});
