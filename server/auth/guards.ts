import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { MemberRole } from "@/lib/domain";
import { db, sql } from "../db";
import { env } from "../env";
import { getCurrentSession, type SessionUser, type ValidSession } from "./session";

export type Member = {
  id: string;
  name: string;
  email: string;
  avatarKey: string | null;
  role: MemberRole;
};

export type WorkspaceContext = {
  session: ValidSession;
  user: SessionUser;
  workspace: { id: string; name: string; togetherSince: string | null };
  role: MemberRole;
  members: Member[];
  partner: Member | null;
};

export function needsEmailVerification(user: SessionUser): boolean {
  return env().REQUIRE_EMAIL_VERIFICATION && !user.emailVerifiedAt;
}

type MembershipRow = Member & { workspaceId: string; workspaceName: string; togetherSince: string | null };

const loadMembership = cache(async (userId: string) =>
  db.many<MembershipRow>(sql`
    SELECT w.id AS workspace_id, w.name AS workspace_name, w.together_since,
           u.id, u.name, u.email, u.avatar_key, m.role
    FROM workspace_members me
    JOIN workspaces w ON w.id = me.workspace_id
    JOIN workspace_members m ON m.workspace_id = w.id
    JOIN users u ON u.id = m.user_id
    WHERE me.user_id = ${userId}
    ORDER BY m.joined_at ASC`),
);

/** Construit le contexte d'espace à partir de la session (jamais à partir d'une donnée client). */
export async function resolveWorkspaceContext(session: ValidSession): Promise<WorkspaceContext | null> {
  const rows = await loadMembership(session.user.id);
  const first = rows[0];
  if (!first) return null;
  const members: Member[] = rows.map(({ id, name, email, avatarKey, role }) => ({ id, name, email, avatarKey, role }));
  const me = members.find((m) => m.id === session.user.id)!;
  return {
    session,
    user: session.user,
    workspace: { id: first.workspaceId, name: first.workspaceName, togetherSince: first.togetherSince },
    role: me.role,
    members,
    partner: members.find((m) => m.id !== session.user.id) ?? null,
  };
}

/** Page ou action réservée aux utilisateurs connectés. */
export async function requireUser(options: { allowUnverified?: boolean } = {}): Promise<ValidSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!options.allowUnverified && needsEmailVerification(session.user)) redirect("/verify-email");
  return session;
}

/** Page ou action réservée aux membres d'un espace. */
export async function requireWorkspace(): Promise<WorkspaceContext> {
  const session = await requireUser();
  const ctx = await resolveWorkspaceContext(session);
  if (!ctx) redirect("/onboarding");
  return ctx;
}

/** Variante pour les route handlers : renvoie null au lieu de rediriger. */
export async function getApiContext(): Promise<WorkspaceContext | null> {
  const session = await getCurrentSession();
  if (!session || needsEmailVerification(session.user)) return null;
  return resolveWorkspaceContext(session);
}
