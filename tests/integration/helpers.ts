import { randomUUID } from "node:crypto";
import { db, sql } from "@/server/db";
import { seedWorkspaceDefaults } from "@/server/services/defaults";

const uniqueEmail = (name: string) => `${name.toLowerCase()}-${randomUUID().slice(0, 8)}@exemple.fr`;

/** Crée un utilisateur et son propre espace (pour vérifier l'étanchéité entre espaces). */
export async function createCouple(name: string) {
  return db.tx(async (tx) => {
    const user = await tx.one<{ id: string; name: string; email: string }>(sql`
      INSERT INTO users (name, email, password_hash, email_verified_at)
      VALUES (${name}, ${uniqueEmail(name)}, 'x', now())
      RETURNING id, name, email`);
    const workspace = await tx.one<{ id: string }>(sql`INSERT INTO workspaces (name) VALUES (${`Espace de ${name}`}) RETURNING id`);
    await tx.exec(sql`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (${workspace.id}, ${user.id}, 'owner')`);
    await seedWorkspaceDefaults(tx, workspace.id, user.id);
    return { user, workspaceId: workspace.id };
  });
}

export async function createUser(name: string) {
  return db.one<{ id: string; name: string; email: string }>(sql`
    INSERT INTO users (name, email, password_hash, email_verified_at)
    VALUES (${name}, ${uniqueEmail(name)}, 'x', now())
    RETURNING id, name, email`);
}

export const testAccount = (name: string) => ({ name, email: uniqueEmail(name.split(" ")[0]!) });
