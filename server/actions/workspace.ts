"use server";

import { revalidatePath } from "next/cache";
import { deleteContentSchema, workspaceSchema } from "@/lib/validation/workspace";
import { workspaceAction } from "../safe-action";
import * as workspaces from "../services/workspace";

export const updateWorkspaceAction = workspaceAction(workspaceSchema, async (input, ctx) => {
  await workspaces.updateWorkspace(ctx.workspace.id, input);
  revalidatePath("/", "layout");
});

export const deleteWorkspaceContentAction = workspaceAction(deleteContentSchema, async (_input, ctx) => {
  await workspaces.deleteWorkspaceContent(ctx.workspace.id, ctx.user.id);
  revalidatePath("/", "layout");
});
