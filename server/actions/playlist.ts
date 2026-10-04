"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rateLimit } from "../auth/rate-limit";
import { UserError } from "../errors";
import { workspaceAction } from "../safe-action";
import * as playlist from "../services/playlist";

export const setPlaylistAction = workspaceAction(z.object({ url: z.string().trim().min(1).max(500) }), async ({ url }, ctx) => {
  const limit = await rateLimit(`playlist:${ctx.workspace.id}`, 30, 60 * 60);
  if (!limit.allowed) throw new UserError("Trop de synchronisations. Réessayez plus tard.");
  await playlist.syncPlaylist(ctx.workspace.id, url);
  revalidatePath("/playlist");
});

export const removePlaylistAction = workspaceAction(z.object({}), async (_input, ctx) => {
  await playlist.removePlaylist(ctx.workspace.id);
  revalidatePath("/playlist");
});

export const disconnectSpotifyAction = workspaceAction(z.object({}), async (_input, ctx) => {
  await playlist.disconnectSpotify(ctx.workspace.id);
  revalidatePath("/playlist");
});
