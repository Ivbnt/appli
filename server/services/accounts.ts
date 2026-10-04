import "server-only";
import { defaultWorkspaceName, type ConfiguredAccount } from "@/lib/accounts";
import { db, sql } from "../db";
import { env } from "../env";
import { seedWorkspaceDefaults } from "./defaults";

const LOCK_ID = 727_002;

/** Comptes autorisés (variable ACCOUNTS). Personne d'autre ne peut se connecter. */
export const configuredAccounts = (): ConfiguredAccount[] => env().ACCOUNTS;

export const isConfiguredEmail = (email: string) => configuredAccounts().some((account) => account.email === email.toLowerCase());

/**
 * Crée les comptes déclarés dans ACCOUNTS s'ils n'existent pas encore, puis les réunit
 * dans un même espace. Idempotent : peut être appelé à chaque démarrage.
 *
 * Les comptes sont créés sans mot de passe : chacun choisit le sien via le lien
 * « Première connexion » reçu par e-mail. L'adresse n'a pas à être vérifiée, puisqu'elle
 * est fixée par la configuration et que choisir son mot de passe passe par elle.
 */
export async function ensureAccounts(accounts: ConfiguredAccount[] = configuredAccounts()): Promise<{ workspaceId: string }> {
  return db.tx(async (tx) => {
    await tx.exec(sql`SELECT pg_advisory_xact_lock(${LOCK_ID})`);

    const users: { id: string; email: string }[] = [];
    for (const account of accounts) {
      users.push(
        await tx.one<{ id: string; email: string }>(sql`
          INSERT INTO users (name, email, password_hash, email_verified_at)
          VALUES (${account.name}, ${account.email}, NULL, now())
          ON CONFLICT (email) DO UPDATE SET email_verified_at = COALESCE(users.email_verified_at, now())
          RETURNING id, email`),
      );
    }
    const ids = users.map((u) => u.id);

    const memberships = await tx.many<{ userId: string; workspaceId: string }>(sql`
      SELECT user_id, workspace_id FROM workspace_members WHERE user_id = ANY(${ids}::uuid[])`);

    let workspaceId = memberships[0]?.workspaceId;
    if (!workspaceId) {
      const workspace = await tx.one<{ id: string }>(sql`
        INSERT INTO workspaces (name) VALUES (${defaultWorkspaceName(accounts)}) RETURNING id`);
      workspaceId = workspace.id;
      await seedWorkspaceDefaults(tx, workspaceId, ids[0]!);
    }

    for (const [index, user] of users.entries()) {
      const membership = memberships.find((m) => m.userId === user.id);
      if (membership) {
        if (membership.workspaceId !== workspaceId) {
          console.warn(`[accounts] ${user.email} appartient déjà à un autre espace : il n'a pas été déplacé.`);
        }
        continue;
      }
      await tx.exec(sql`
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (${workspaceId}, ${user.id}, ${index === 0 && memberships.length === 0 ? "owner" : "member"})`);
    }

    // Une adresse retirée de la configuration quitte l'espace (ses données restent à l'espace).
    // Remettre l'adresse dans ACCOUNTS lui rend l'accès.
    await tx.exec(sql`
      DELETE FROM workspace_members WHERE workspace_id = ${workspaceId} AND NOT (user_id = ANY(${ids}::uuid[]))`);

    return { workspaceId };
  });
}

let ensured: { key: string; promise: Promise<unknown> } | undefined;

/** `ensureAccounts`, exécuté une seule fois par processus (et de nouveau si ACCOUNTS change). */
export function ensureAccountsOnce(): Promise<unknown> {
  const accounts = configuredAccounts();
  const key = JSON.stringify(accounts);
  if (ensured?.key !== key) {
    const promise = ensureAccounts(accounts).catch((error) => {
      ensured = undefined;
      throw error;
    });
    ensured = { key, promise };
  }
  return ensured.promise;
}
