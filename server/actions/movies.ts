"use server";

import { revalidatePath } from "next/cache";
import { addMovieFromApiSchema, manualMovieSchema, movieIdSchema, reviewSchema, updateMovieSchema } from "@/lib/validation/movies";
import { UserError } from "../errors";
import { MovieApiUnavailable } from "../integrations/movies";
import { workspaceAction } from "../safe-action";
import { evaluateBadges } from "../services/badges";
import * as movies from "../services/movies";

const refresh = () => {
  revalidatePath("/movies");
  revalidatePath("/");
};

export const addMovieAction = workspaceAction(addMovieFromApiSchema, async ({ externalId, status }, ctx) => {
  try {
    const movie = await movies.addMovieFromApi(ctx.workspace.id, ctx.user.id, externalId, status);
    if (status === "watched") await evaluateBadges(ctx.workspace.id);
    refresh();
    return movie;
  } catch (error) {
    if (error instanceof MovieApiUnavailable) throw new UserError(error.message);
    if (error instanceof UserError) throw error;
    console.error("[movies] TMDB", error);
    throw new UserError("Impossible de récupérer ce film pour le moment. Réessayez ou ajoutez-le manuellement.");
  }
});

export const addManualMovieAction = workspaceAction(manualMovieSchema, async (input, ctx) => {
  const movie = await movies.addManualMovie(ctx.workspace.id, ctx.user.id, input);
  if (input.status === "watched") await evaluateBadges(ctx.workspace.id);
  refresh();
  return movie;
});

export const updateMovieAction = workspaceAction(updateMovieSchema, async ({ id, ...input }, ctx) => {
  const movie = await movies.updateMovie(ctx.workspace.id, id, input);
  if (movie.status === "watched") await evaluateBadges(ctx.workspace.id);
  refresh();
  return movie;
});

export const reviewMovieAction = workspaceAction(reviewSchema, async ({ movieId, rating, comment }, ctx) => {
  const movie = await movies.reviewMovie(ctx.workspace.id, ctx.user.id, movieId, rating, comment);
  await evaluateBadges(ctx.workspace.id);
  refresh();
  return movie;
});

export const deleteMovieAction = workspaceAction(movieIdSchema, async ({ id }, ctx) => {
  await movies.deleteMovie(ctx.workspace.id, id);
  refresh();
});
