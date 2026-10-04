import "server-only";
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

export const DEFAULT_WHO_OF_US = [
  "Qui est le plus susceptible d'oublier ses clés ?",
  "Qui est le plus susceptible de pleurer devant un film ?",
  "Qui est le plus susceptible de partir en voyage sur un coup de tête ?",
  "Qui est le plus susceptible d'être en retard ?",
  "Qui est le plus susceptible de finir le plat de l'autre ?",
  "Qui est le plus susceptible de se perdre sans GPS ?",
  "Qui est le plus susceptible d'adopter un animal sans prévenir ?",
  "Qui est le plus susceptible de lancer une discussion à 2 h du matin ?",
  "Qui est le plus susceptible de gagner à un jeu de société ?",
  "Qui est le plus susceptible de planifier les vacances un an à l'avance ?",
];

export const DEFAULT_QUIZ = {
  title: "Sur la même longueur d'onde ?",
  description: "Répondez chacun de votre côté, puis découvrez à quel point vous êtes en phase.",
  questions: [
    { prompt: "Les vacances idéales ?", options: ["Montagne", "Plage", "Grande ville", "Campagne"] },
    { prompt: "La soirée parfaite ?", options: ["Cinéma", "Restaurant", "À la maison", "Entre amis"] },
    { prompt: "Le petit-déjeuner ?", options: ["Sucré", "Salé", "Juste un café", "Brunch, toujours"] },
    { prompt: "Plutôt…", options: ["Lève-tôt", "Couche-tard"] },
    { prompt: "La destination de rêve ?", options: ["Japon", "Islande", "Italie", "Mexique"] },
    { prompt: "La saison préférée ?", options: ["Printemps", "Été", "Automne", "Hiver"] },
  ],
};

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

  const whoOfUs = await tx.one<{ id: string }>(sql`
    INSERT INTO quizzes (workspace_id, kind, title, created_by_id)
    VALUES (${workspaceId}, 'who_of_us', 'Qui de nous deux ?', ${userId})
    RETURNING id`);
  await tx.exec(sql`
    INSERT INTO quiz_questions (quiz_id, prompt, position, created_by_id)
    SELECT ${whoOfUs.id}::uuid, prompt, position - 1, ${userId}::uuid
    FROM unnest(${DEFAULT_WHO_OF_US}::text[]) WITH ORDINALITY AS t(prompt, position)`);

  const quiz = await tx.one<{ id: string }>(sql`
    INSERT INTO quizzes (workspace_id, kind, title, description, created_by_id)
    VALUES (${workspaceId}, 'couple_quiz', ${DEFAULT_QUIZ.title}, ${DEFAULT_QUIZ.description}, ${userId})
    RETURNING id`);
  for (const [position, question] of DEFAULT_QUIZ.questions.entries()) {
    await tx.exec(sql`
      INSERT INTO quiz_questions (quiz_id, prompt, options, position, created_by_id)
      VALUES (${quiz.id}, ${question.prompt}, ${question.options}::text[], ${position}, ${userId})`);
  }
}
