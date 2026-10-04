"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult, FormState } from "@/lib/action-result";
import { deleteContentSchema, invitationSchema, workspaceSchema } from "@/lib/validation/workspace";
import { requireUser, requireWorkspace } from "../auth/guards";
import { clearPendingInvite } from "../auth/pending-invite";
import { formatRetryAfter, rateLimit } from "../auth/rate-limit";
import { UserError } from "../errors";
import { fieldErrorsFrom, toActionError, workspaceAction } from "../safe-action";
import * as workspaces from "../services/workspace";

export async function createWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const values = { name: String(formData.get("name") ?? ""), togetherSince: String(formData.get("togetherSince") ?? "") };
  const parsed = workspaceSchema.safeParse(values);
  if (!parsed.success) return { error: "Vérifiez les champs indiqués.", fieldErrors: fieldErrorsFrom(parsed.error), values };
  try {
    await workspaces.createWorkspace(session.user.id, parsed.data);
  } catch (error) {
    return { ...toActionError(error), values };
  }
  await clearPendingInvite();
  redirect("/");
}

export async function acceptInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireUser();
  const token = String(formData.get("token") ?? "");
  const limit = await rateLimit(`accept-invite:${session.user.id}`, 10, 15 * 60);
  if (!limit.allowed) return { error: `Trop de tentatives. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.` };
  try {
    await workspaces.acceptInvitation(token, session.user);
  } catch (error) {
    return toActionError(error);
  }
  await clearPendingInvite();
  redirect("/");
}

export async function dismissPendingInviteAction(): Promise<void> {
  await clearPendingInvite();
  redirect("/onboarding");
}

export const createInvitationAction = workspaceAction(invitationSchema, async ({ email }, ctx) => {
  const limit = await rateLimit(`invite:${ctx.workspace.id}`, 10, 60 * 60);
  if (!limit.allowed) throw new UserError(`Trop d'invitations. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.`);
  const result = await workspaces.createInvitation(ctx.workspace.id, ctx.user, email);
  revalidatePath("/settings/couple");
  return result;
});

export const revokeInvitationAction = workspaceAction(z.object({}), async (_input, ctx) => {
  await workspaces.revokeInvitations(ctx.workspace.id);
  revalidatePath("/settings/couple");
});

export const updateWorkspaceAction = workspaceAction(workspaceSchema, async (input, ctx) => {
  await workspaces.updateWorkspace(ctx.workspace.id, input);
  revalidatePath("/", "layout");
});

export async function leaveWorkspaceAction(): Promise<ActionResult> {
  try {
    const ctx = await requireWorkspace();
    await workspaces.leaveWorkspace(ctx.user.id);
  } catch (error) {
    return toActionError(error);
  }
  redirect("/onboarding");
}

export const deleteWorkspaceContentAction = workspaceAction(deleteContentSchema, async (_input, ctx) => {
  await workspaces.deleteWorkspaceContent(ctx.workspace.id, ctx.user.id);
  revalidatePath("/", "layout");
});
