import { z } from "zod";
import { MOVIE_STATUS_VALUES } from "@/lib/domain";
import { id, optionalDateOnly, optionalText, requiredText } from "./common";

export const addMovieFromApiSchema = z.object({
  externalId: z.string().regex(/^\d{1,10}$/),
  status: z.enum(MOVIE_STATUS_VALUES),
});

export const manualMovieSchema = z.object({
  title: requiredText(200, "Indiquez le titre du film."),
  year: z.number().int().min(1870).max(2200).nullable(),
  genres: z.array(z.string().trim().min(1).max(40)).max(8),
  runtime: z.number().int().min(1).max(1000).nullable(),
  overview: optionalText(3000),
  status: z.enum(MOVIE_STATUS_VALUES),
});

export const updateMovieSchema = z.object({
  id,
  status: z.enum(MOVIE_STATUS_VALUES),
  watchedAt: optionalDateOnly,
  notes: optionalText(3000),
});

export const reviewSchema = z.object({
  movieId: id,
  rating: z.number().int().min(1).max(10),
  comment: optionalText(2000),
});

export const movieIdSchema = z.object({ id });
