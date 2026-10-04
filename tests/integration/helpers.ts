import { randomUUID } from "node:crypto";
import { db, sql } from "@/server/db";
import { createWorkspace } from "@/server/services/workspace";

/** Crée un utilisateur vérifié et son espace. */
export async function createCouple(name: string) {
  const user = await db.one<{ id: string; name: string; email: string }>(sql`
    INSERT INTO users (name, email, password_hash, email_verified_at)
    VALUES (${name}, ${`${name.toLowerCase()}-${randomUUID().slice(0, 8)}@exemple.fr`}, 'x', now())
    RETURNING id, name, email`);
  const workspace = await createWorkspace(user.id, { name: `Espace de ${name}`, togetherSince: null });
  return { user, workspaceId: workspace.id };
}

export async function createUser(name: string, verified = true) {
  return db.one<{ id: string; name: string; email: string }>(sql`
    INSERT INTO users (name, email, password_hash, email_verified_at)
    VALUES (${name}, ${`${name.toLowerCase()}-${randomUUID().slice(0, 8)}@exemple.fr`}, 'x', ${verified ? new Date() : null})
    RETURNING id, name, email`);
}
