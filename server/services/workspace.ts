import "server-only";
import { generateToken, hashToken } from "../auth/crypto";
import { db, sql } from "../db";
import { sendEmail } from "../email";
import { appUrl, invitationEmail, partnerJoinedEmail } from "../email/templates";
import { NotFoundError, UserError } from "../errors";
import { flushFileDeletions, queueFileDeletion } from "../storage";
import { seedWorkspaceDefaults } from "./defaults";
import { collectWorkspaceFileKeys } from "./files";

export const MAX_MEMBERS = 2;
const INVITATION_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function createWorkspace(userId: string, input: { name: string; togetherSince: string | null }) {
  return db.tx(async (tx) => {
    const existing = await tx.count(sql`SELECT count(*) FROM workspace_members WHERE user_id = ${userId}`);
    if (existing > 0) throw new UserError("Vous faites déjà partie d'un espace.");
    const workspace = await tx.one<{ id: string }>(sql`
      INSERT INTO workspaces (name, together_since) VALUES (${input.name}, ${input.togetherSince}) RETURNING id`);
    await tx.exec(sql`
      INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (${workspace.id}, ${userId}, 'owner')`);
    await seedWorkspaceDefaults(tx, workspace.id, userId);
    return workspace;
  });
}

export async function updateWorkspace(workspaceId: string, input: { name: string; togetherSince: string | null }) {
  await db.exec(sql`
    UPDATE workspaces SET name = ${input.name}, together_since = ${input.togetherSince} WHERE id = ${workspaceId}`);
}

export type PendingInvitation = { id: string; email: string | null; expiresAt: Date; createdAt: Date };

export async function getPendingInvitation(workspaceId: string): Promise<PendingInvitation | null> {
  return db.maybe<PendingInvitation>(sql`
    SELECT id, email, expires_at, created_at FROM invitations
    WHERE workspace_id = ${workspaceId} AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1`);
}

/**
 * Crée une invitation (lien à usage unique, valable 7 jours) et l'envoie par e-mail si une
 * adresse est fournie. Toute invitation précédente encore active est révoquée.
 */
export async function createInvitation(
  workspaceId: string,
  inviter: { id: string; name: string },
  email: string | null,
): Promise<{ url: string; emailSent: boolean }> {
  const token = generateToken();
  const workspace = await db.tx(async (tx) => {
    const row = await tx.one<{ name: string; members: number }>(sql`
      SELECT w.name, (SELECT count(*) FROM workspace_members m WHERE m.workspace_id = w.id) AS members
      FROM workspaces w WHERE w.id = ${workspaceId} FOR UPDATE`);
    if (row.members >= MAX_MEMBERS) throw new UserError("Votre espace est déjà complet.");
    if (email) {
      const member = await tx.count(sql`
        SELECT count(*) FROM workspace_members m JOIN users u ON u.id = m.user_id
        WHERE m.workspace_id = ${workspaceId} AND u.email = ${email}`);
      if (member > 0) throw new UserError("Cette personne fait déjà partie de l'espace.", { email: ["Déjà membre."] });
    }
    await tx.exec(sql`
      UPDATE invitations SET revoked_at = now()
      WHERE workspace_id = ${workspaceId} AND accepted_at IS NULL AND revoked_at IS NULL`);
    await tx.exec(sql`
      INSERT INTO invitations (workspace_id, email, token_hash, invited_by_id, expires_at)
      VALUES (${workspaceId}, ${email}, ${hashToken(token)}, ${inviter.id}, now() + make_interval(secs => ${INVITATION_TTL_SECONDS}))`);
    return row;
  });

  let emailSent = false;
  if (email) {
    const delivery = await sendEmail(invitationEmail(email, inviter.name, workspace.name, token));
    emailSent = delivery.delivered;
  }
  return { url: appUrl(`/invite/${token}`), emailSent };
}

export async function revokeInvitations(workspaceId: string): Promise<void> {
  await db.exec(sql`
    UPDATE invitations SET revoked_at = now()
    WHERE workspace_id = ${workspaceId} AND accepted_at IS NULL AND revoked_at IS NULL`);
}

export type InvitationPreview = {
  workspaceId: string;
  workspaceName: string;
  inviterName: string | null;
  email: string | null;
  status: "valid" | "expired" | "used" | "full";
};

export async function previewInvitation(token: string): Promise<InvitationPreview | null> {
  const row = await db.maybe<{
    workspaceId: string;
    workspaceName: string;
    inviterName: string | null;
    email: string | null;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    members: number;
  }>(sql`
    SELECT w.id AS workspace_id, w.name AS workspace_name, u.name AS inviter_name, i.email, i.expires_at, i.accepted_at, i.revoked_at,
           (SELECT count(*) FROM workspace_members m WHERE m.workspace_id = w.id) AS members
    FROM invitations i
    JOIN workspaces w ON w.id = i.workspace_id
    LEFT JOIN users u ON u.id = i.invited_by_id
    WHERE i.token_hash = ${hashToken(token)}`);
  if (!row) return null;
  const status: InvitationPreview["status"] =
    row.acceptedAt || row.revokedAt ? "used" : row.expiresAt < new Date() ? "expired" : row.members >= MAX_MEMBERS ? "full" : "valid";
  return { workspaceId: row.workspaceId, workspaceName: row.workspaceName, inviterName: row.inviterName, email: row.email, status };
}

/** Accepte une invitation. Verrouille l'espace pour garantir la limite de deux membres. */
export async function acceptInvitation(token: string, user: { id: string; name: string; email: string }) {
  const result = await db.tx(async (tx) => {
    const invitation = await tx.maybe<{ id: string; workspaceId: string; email: string | null; invitedById: string | null }>(sql`
      SELECT id, workspace_id, email, invited_by_id FROM invitations
      WHERE token_hash = ${hashToken(token)} AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
      FOR UPDATE`);
    if (!invitation) throw new UserError("Cette invitation n'est plus valable.");
    if (invitation.email && invitation.email !== user.email) {
      throw new UserError(`Cette invitation est destinée à ${invitation.email}. Connectez-vous avec cette adresse.`);
    }

    const alreadyMember = await tx.maybe<{ workspaceId: string }>(sql`
      SELECT workspace_id FROM workspace_members WHERE user_id = ${user.id}`);
    if (alreadyMember?.workspaceId === invitation.workspaceId) return { workspaceId: invitation.workspaceId, joined: false };
    if (alreadyMember) {
      throw new UserError("Vous faites déjà partie d'un autre espace. Quittez-le depuis les paramètres avant d'accepter.");
    }

    const workspace = await tx.one<{ name: string }>(sql`SELECT name FROM workspaces WHERE id = ${invitation.workspaceId} FOR UPDATE`);
    const members = await tx.count(sql`SELECT count(*) FROM workspace_members WHERE workspace_id = ${invitation.workspaceId}`);
    if (members >= MAX_MEMBERS) throw new UserError("Cet espace est déjà complet.");

    await tx.exec(sql`
      INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (${invitation.workspaceId}, ${user.id}, 'member')`);
    await tx.exec(sql`
      UPDATE invitations SET accepted_at = now(), accepted_by_id = ${user.id} WHERE id = ${invitation.id}`);
    const inviter = invitation.invitedById
      ? await tx.maybe<{ name: string; email: string; emailNotifications: boolean }>(sql`
          SELECT name, email, email_notifications FROM users WHERE id = ${invitation.invitedById}`)
      : null;
    return { workspaceId: invitation.workspaceId, joined: true, inviter, workspaceName: workspace.name };
  });

  if (result.joined && "inviter" in result && result.inviter?.emailNotifications) {
    await sendEmail(partnerJoinedEmail(result.inviter.email, result.inviter.name, user.name, result.workspaceName)).catch(
      (error) => console.error("[workspace] e-mail de bienvenue non envoyé", error),
    );
  }
  return { workspaceId: result.workspaceId };
}

/**
 * Quitter l'espace. Si l'utilisateur était seul, l'espace et tous ses fichiers sont supprimés.
 * Sinon les données restent à l'autre membre, qui devient propriétaire.
 */
export async function leaveWorkspace(userId: string): Promise<{ deletedWorkspace: boolean }> {
  const result = await db.tx(async (tx) => {
    const membership = await tx.maybe<{ workspaceId: string }>(sql`
      SELECT workspace_id FROM workspace_members WHERE user_id = ${userId}`);
    if (!membership) throw new NotFoundError("Espace");
    await tx.exec(sql`SELECT id FROM workspaces WHERE id = ${membership.workspaceId} FOR UPDATE`);
    const members = await tx.count(sql`SELECT count(*) FROM workspace_members WHERE workspace_id = ${membership.workspaceId}`);
    if (members <= 1) {
      await queueFileDeletion(await collectWorkspaceFileKeys(tx, membership.workspaceId), tx);
      await tx.exec(sql`DELETE FROM workspaces WHERE id = ${membership.workspaceId}`);
      return { deletedWorkspace: true };
    }
    await tx.exec(sql`DELETE FROM workspace_members WHERE user_id = ${userId}`);
    await tx.exec(sql`UPDATE workspace_members SET role = 'owner' WHERE workspace_id = ${membership.workspaceId}`);
    // Les tâches assignées à la personne qui part ne sont plus assignées.
    await tx.exec(sql`
      UPDATE tasks SET assigned_to_id = NULL WHERE workspace_id = ${membership.workspaceId} AND assigned_to_id = ${userId}`);
    return { deletedWorkspace: false };
  });
  flushFileDeletions();
  return result;
}

/** Efface tout le contenu de l'espace (souvenirs, lieux, tâches…) en conservant l'espace et ses membres. */
export async function deleteWorkspaceContent(workspaceId: string, userId: string): Promise<void> {
  await db.tx(async (tx) => {
    await tx.exec(sql`SELECT id FROM workspaces WHERE id = ${workspaceId} FOR UPDATE`);
    await queueFileDeletion(await collectWorkspaceFileKeys(tx, workspaceId), tx);
    for (const table of [
      "reminders", "calendar_events", "photos", "albums", "milestones", "locations", "reservations", "trips",
      "tasks", "task_categories", "movies", "playlists", "spotify_connections", "activities", "challenges",
      "quizzes", "user_badges",
    ]) {
      await tx.exec(sql`DELETE FROM ${sql.raw(table)} WHERE workspace_id = ${workspaceId}`);
    }
    await seedWorkspaceDefaults(tx, workspaceId, userId);
  });
  flushFileDeletions();
}
