import { describe, expect, it } from "vitest";
import { rateLimit } from "@/server/auth/rate-limit";
import { db, sql } from "@/server/db";
import { ensureAccounts, isConfiguredEmail } from "@/server/services/accounts";
import { consumeAuthToken, createAuthToken, requestPasswordReset, resetPassword } from "@/server/services/auth";
import { evaluateBadges } from "@/server/services/badges";
import { createTrip } from "@/server/services/trips";
import { createCouple, createUser, testAccount } from "./helpers";

const membersOf = (workspaceId: string) =>
  db.many<{ email: string; role: string }>(sql`
    SELECT u.email, m.role FROM workspace_members m JOIN users u ON u.id = m.user_id
    WHERE m.workspace_id = ${workspaceId} ORDER BY m.joined_at, u.email`);

describe("comptes fixes", () => {
  it("crée les deux comptes, sans mot de passe, déjà réunis dans le même espace", async () => {
    const accounts = [testAccount("Léa Martin"), testAccount("Hugo Petit")];
    const { workspaceId } = await ensureAccounts(accounts);

    const users = await db.many<{ email: string; passwordHash: string | null; emailVerifiedAt: Date | null }>(sql`
      SELECT email, password_hash, email_verified_at FROM users WHERE email = ANY(${accounts.map((a) => a.email)}::text[])`);
    expect(users).toHaveLength(2);
    expect(users.every((u) => u.passwordHash === null && u.emailVerifiedAt !== null)).toBe(true);
    expect((await membersOf(workspaceId)).map((m) => m.email).sort()).toEqual(accounts.map((a) => a.email).sort());
    expect((await db.one<{ name: string }>(sql`SELECT name FROM workspaces WHERE id = ${workspaceId}`)).name).toBe("Léa & Hugo");
    // Catégories de tâches par défaut créées avec l'espace.
    expect(await db.count(sql`SELECT count(*) FROM task_categories WHERE workspace_id = ${workspaceId}`)).toBeGreaterThan(0);
  });

  it("est idempotent et conserve les modifications (nom, mot de passe)", async () => {
    const accounts = [testAccount("Léa Martin"), testAccount("Hugo Petit")];
    const first = await ensureAccounts(accounts);
    await db.exec(sql`UPDATE users SET name = 'Lé', password_hash = 'hash' WHERE email = ${accounts[0]!.email}`);

    const second = await ensureAccounts(accounts);
    expect(second.workspaceId).toBe(first.workspaceId);
    expect(await membersOf(first.workspaceId)).toHaveLength(2);
    expect(await db.one(sql`SELECT name, password_hash FROM users WHERE email = ${accounts[0]!.email}`)).toEqual({ name: "Lé", passwordHash: "hash" });
  });

  it("rattache à l'espace existant un compte ajouté plus tard à la configuration", async () => {
    const [lea, hugo] = [testAccount("Léa Martin"), testAccount("Hugo Petit")];
    const { workspaceId } = await ensureAccounts([lea!]);
    expect(await membersOf(workspaceId)).toEqual([{ email: lea!.email, role: "owner" }]);
    expect((await ensureAccounts([lea!, hugo!])).workspaceId).toBe(workspaceId);
    expect(await membersOf(workspaceId)).toEqual([
      { email: lea!.email, role: "owner" },
      { email: hugo!.email, role: "member" },
    ]);
  });

  it("n'autorise que les adresses déclarées dans ACCOUNTS", () => {
    expect(isConfiguredEmail("alice@exemple.fr")).toBe(true);
    expect(isConfiguredEmail("ALICE@Exemple.fr")).toBe(true);
    expect(isConfiguredEmail("chloe@exemple.fr")).toBe(false);
  });

  it("première connexion : le lien reçu par e-mail permet de choisir son mot de passe", async () => {
    const account = testAccount("Léa Martin");
    await ensureAccounts([account]);
    await requestPasswordReset(account.email);
    const { id } = await db.one<{ id: string }>(sql`SELECT id FROM users WHERE email = ${account.email}`);
    expect(await db.count(sql`SELECT count(*) FROM auth_tokens WHERE user_id = ${id} AND used_at IS NULL`)).toBe(1);

    const token = await createAuthToken(id, "password_reset");
    expect(await resetPassword(token, "un-mot-de-passe-solide")).toBe(id);
    expect((await db.one<{ passwordHash: string | null }>(sql`SELECT password_hash FROM users WHERE id = ${id}`)).passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("les jetons de réinitialisation sont à usage unique", async () => {
    const user = await createUser("Alice");
    const token = await createAuthToken(user.id, "password_reset");
    expect(await consumeAuthToken(token, "password_reset")).toBe(user.id);
    expect(await consumeAuthToken(token, "password_reset")).toBeNull();
  });

  it("limite le nombre de tentatives (rate limiting)", async () => {
    const key = `test:${Date.now()}`;
    for (let i = 0; i < 3; i++) expect((await rateLimit(key, 3, 60)).allowed).toBe(true);
    const blocked = await rateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("badges", () => {
  it("attribue « Premier voyage » une seule fois", async () => {
    const { user, workspaceId } = await createCouple("Alice");
    await createTrip(workspaceId, user.id, { title: "Lisbonne", destination: "Lisbonne", startDate: "2023-09-18", endDate: "2023-09-24", description: null, latitude: null, longitude: null });
    expect((await evaluateBadges(workspaceId)).map((b) => b.name)).toContain("Premier voyage");
    expect(await evaluateBadges(workspaceId)).toEqual([]);
  });
});

describe("changement d'adresse dans ACCOUNTS", () => {
  it("le nouveau compte remplace l'ancien dans l'espace, qui garde ses données", async () => {
    const [lea, hugo, renamed] = [testAccount("Léa Martin"), testAccount("Hugo Petit"), testAccount("Hugo Petit")];
    const { workspaceId } = await ensureAccounts([lea!, hugo!]);
    const user = await db.one<{ id: string }>(sql`SELECT id FROM users WHERE email = ${hugo!.email}`);
    await createTrip(workspaceId, user.id, { title: "Rome", destination: "Rome", startDate: "2026-03-01", endDate: "2026-03-04", description: null, latitude: null, longitude: null });

    expect((await ensureAccounts([lea!, renamed!])).workspaceId).toBe(workspaceId);
    expect((await membersOf(workspaceId)).map((m) => m.email).sort()).toEqual([lea!.email, renamed!.email].sort());
    expect(await db.count(sql`SELECT count(*) FROM trips WHERE workspace_id = ${workspaceId}`)).toBe(1);
  });
});
