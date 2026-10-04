import "server-only";
import { interleavedWhoQuestions, LEGACY_WHO_OF_US } from "@/lib/fun/who-of-us-data";
import { sql, type Tx } from "../db";

export const DEFAULT_TASK_CATEGORIES = [
  { slug: "general", name: "Général" },
  { slug: "restaurants", name: "Restaurants" },
  { slug: "recipes", name: "Recettes" },
  { slug: "trips", name: "Voyages" },
  { slug: "movies", name: "Films" },
  { slug: "activities", name: "Activités" },
  { slug: "shopping", name: "Achats" },
  { slug: "ideas", name: "Idées" },
] as const;

export const DEFAULT_TONIGHT = [
  "Cinéma",
  "Restaurant",
  "Cuisiner ensemble",
  "Balade",
  "Soirée jeux",
  "Musée",
  "Cocktail",
  "Activité surprise",
];

export const DEFAULT_WHEEL = [
  "Pique-nique",
  "Nouvelle recette",
  "Expo ou galerie",
  "Concert",
  "Escape game",
  "Vélo",
  "Brunch",
  "Karaoké",
];

/** Contenu initial d'un nouvel espace : catégories, listes d'activités et jeux prêts à l'emploi. */
export async function seedWorkspaceDefaults(tx: Tx, workspaceId: string, userId: string): Promise<void> {
  await tx.exec(sql`
    INSERT INTO task_categories (workspace_id, slug, name, position)
    SELECT ${workspaceId}::uuid, slug, name, position - 1
    FROM unnest(${DEFAULT_TASK_CATEGORIES.map((c) => c.slug)}::text[], ${DEFAULT_TASK_CATEGORIES.map((c) => c.name)}::text[])
      WITH ORDINALITY AS t(slug, name, position)`);

  await tx.exec(sql`
    INSERT INTO activities (workspace_id, label, pool)
    SELECT ${workspaceId}::uuid, label, 'tonight' FROM unnest(${DEFAULT_TONIGHT}::text[]) AS label
    UNION ALL
    SELECT ${workspaceId}::uuid, label, 'wheel' FROM unnest(${DEFAULT_WHEEL}::text[]) AS label`);

  await installWhoOfUsLibrary(tx, workspaceId, userId);
}

/**
 * Ajoute la grande liste « Qui de nous deux ? » à l'espace, une seule fois : une question
 * supprimée ensuite ne revient pas. Les anciennes questions par défaut, trop simples, sont
 * retirées si personne n'y a encore répondu.
 */
export async function installWhoOfUsLibrary(tx: Tx, workspaceId: string, userId: string): Promise<void> {
  const claimed = await tx.maybe(sql`
    INSERT INTO app_settings (key, value) VALUES (${whoLibraryKey(workspaceId)}, 'v1')
    ON CONFLICT (key) DO NOTHING
    RETURNING key`);
  if (!claimed) return;

  const quiz =
    (await tx.maybe<{ id: string }>(sql`
      SELECT id FROM quizzes WHERE workspace_id = ${workspaceId} AND kind = 'who_of_us' ORDER BY created_at LIMIT 1`)) ??
    (await tx.one<{ id: string }>(sql`
      INSERT INTO quizzes (workspace_id, kind, title, created_by_id)
      VALUES (${workspaceId}, 'who_of_us', 'Qui de nous deux ?', ${userId})
      RETURNING id`));

  await tx.exec(sql`
    DELETE FROM quiz_questions q
    WHERE q.quiz_id = ${quiz.id} AND q.prompt = ANY(${LEGACY_WHO_OF_US}::text[])
      AND NOT EXISTS (SELECT 1 FROM quiz_answers a WHERE a.question_id = q.id)`);

  const library = interleavedWhoQuestions();
  await tx.exec(sql`
    INSERT INTO quiz_questions (quiz_id, prompt, category, position, created_by_id)
    SELECT ${quiz.id}::uuid, t.prompt, t.category,
           (SELECT COALESCE(max(position), -1) FROM quiz_questions WHERE quiz_id = ${quiz.id}) + t.position, ${userId}::uuid
    FROM unnest(${library.map((q) => q.prompt)}::text[], ${library.map((q) => q.category)}::text[]) WITH ORDINALITY AS t(prompt, category, position)
    WHERE NOT EXISTS (SELECT 1 FROM quiz_questions q WHERE q.quiz_id = ${quiz.id} AND q.prompt = t.prompt)`);
}

export const whoLibraryKey = (workspaceId: string) => `who-of-us:library:${workspaceId}`;
