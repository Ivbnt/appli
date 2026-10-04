/**
 * Données de démonstration (entièrement fictives), ajoutées à l'espace des comptes
 * déclarés dans ACCOUNTS.
 *
 *   npm run db:seed                         → remplit l'espace s'il est encore vide
 *   npm run db:seed -- --force              → efface d'abord le contenu de l'espace
 *
 * À réserver à un essai : --force supprime définitivement le contenu existant.
 */
import sharp from "sharp";
import { addDays, fromLocalInput, todayISO } from "@/lib/dates";
import { db, pool, sql } from "@/server/db";
import { processFileDeletions } from "@/server/storage";
import { ensureAccounts } from "@/server/services/accounts";
import { evaluateBadges } from "@/server/services/badges";
import { createEvent } from "@/server/services/calendar";
import { addManualMovie, reviewMovie } from "@/server/services/movies";
import { createAlbum, saveMilestone, uploadPhoto } from "@/server/services/photos";
import { createPlace } from "@/server/services/places";
import { createTask, listCategories } from "@/server/services/tasks";
import { createReservation, createTrip } from "@/server/services/trips";
import { deleteWorkspaceContent } from "@/server/services/workspace";

const today = todayISO();

/** Image abstraite générée (dégradé doux) : aucune vraie photo n'est utilisée. */
async function abstractImage(seed: number) {
  const hues = [28, 205, 150, 35, 220, 95, 15, 190, 260, 60, 170, 240];
  const h = hues[seed % hues.length]!;
  const svg = `<svg width="1800" height="1350" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${h},32%,74%)"/><stop offset="1" stop-color="hsl(${(h + 25) % 360},28%,40%)"/>
      </linearGradient>
      <radialGradient id="r" cx="${30 + (seed * 17) % 50}%" cy="${35 + (seed * 13) % 40}%" r="45%">
        <stop offset="0" stop-color="hsla(${(h + 40) % 360},45%,88%,0.55)"/><stop offset="1" stop-color="hsla(0,0%,100%,0)"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/>
    <rect y="${900 + (seed % 3) * 60}" width="100%" height="500" fill="hsla(${h},25%,22%,0.22)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

const CONTENT_TABLES = ["locations", "tasks", "calendar_events", "photos", "movies", "trips", "challenges", "quizzes"];

async function main() {
  const force = process.argv.includes("--force");

  const { workspaceId } = await ensureAccounts();
  const users = await db.many<{ id: string; name: string; email: string }>(sql`
    SELECT u.id, u.name, u.email FROM workspace_members m JOIN users u ON u.id = m.user_id
    WHERE m.workspace_id = ${workspaceId} ORDER BY m.joined_at`);
  const [lea, hugo = lea] = users;
  const partnerName = hugo!.name.split(/\s+/)[0];

  const counts = await Promise.all(CONTENT_TABLES.map((table) => db.count(sql`SELECT count(*) FROM ${sql.raw(table)} WHERE workspace_id = ${workspaceId}`)));
  if (counts.some((count) => count > 0)) {
    if (!force) {
      console.info("L'espace contient déjà des données : rien n'a été ajouté (--force efface d'abord tout le contenu).");
      return;
    }
    console.info("→ Effacement du contenu existant");
    await deleteWorkspaceContent(workspaceId, lea!.id);
    await processFileDeletions(10_000);
  }
  await db.exec(sql`UPDATE workspaces SET together_since = COALESCE(together_since, '2021-06-12') WHERE id = ${workspaceId}`);

  console.info("→ Lieux");
  const places = [
    { name: "Le Comptoir du Relais", address: "9 Carrefour de l'Odéon, Paris", latitude: 48.8521, longitude: 2.3389, category: "restaurant", status: "visited", visitedAt: "2025-02-14", rating: 5 },
    { name: "Café de Flore", address: "172 Bd Saint-Germain, Paris", latitude: 48.8541, longitude: 2.3326, category: "cafe", status: "visited", visitedAt: "2024-11-03", rating: 4 },
    { name: "Little Red Door", address: "60 Rue Charlot, Paris", latitude: 48.8636, longitude: 2.3631, category: "bar", status: "want_to_visit" },
    { name: "Septime", address: "80 Rue de Charonne, Paris", latitude: 48.8536, longitude: 2.3807, category: "restaurant", status: "want_to_visit" },
    { name: "Musée d'Orsay", address: "1 Rue de la Légion d'Honneur, Paris", latitude: 48.86, longitude: 2.3266, category: "activity", status: "visited", visitedAt: "2024-03-09", rating: 5 },
    { name: "Miradouro da Senhora do Monte", address: "Lisbonne, Portugal", latitude: 38.7194, longitude: -9.1324, category: "travel", status: "visited", visitedAt: "2023-09-21", rating: 5 },
    { name: "Roscioli", address: "Via dei Giubbonari 21, Rome", latitude: 41.8938, longitude: 12.4729, category: "restaurant", status: "want_to_visit" },
    { name: "Hôtel des Grands Boulevards", address: "17 Bd Poissonnière, Paris", latitude: 48.8712, longitude: 2.3456, category: "hotel", status: "want_to_visit" },
  ] as const;
  for (const place of places) {
    await createPlace(workspaceId, lea!.id, {
      ...place,
      visitedAt: "visitedAt" in place ? place.visitedAt : null,
      rating: "rating" in place ? place.rating : null,
      notes: null,
      externalUrl: null,
      tripId: null,
    });
  }

  console.info("→ Tâches");
  const categories = new Map((await listCategories(workspaceId)).map((c) => [c.slug, c.id]));
  const tasks = [
    { title: "Réserver le restaurant pour l'anniversaire", category: "restaurants", priority: "high", dueDate: addDays(today, 5), assignee: hugo },
    { title: "Acheter les billets du concert", category: "activities", priority: "medium", dueDate: addDays(today, 12), assignee: lea },
    { title: "Tester la recette du risotto aux cèpes", category: "recipes", priority: "low", dueDate: null, assignee: null },
    { title: "Cuisiner un tiramisu maison", category: "recipes", priority: "medium", dueDate: null, assignee: null, status: "done" },
    { title: "Renouveler les passeports", category: "trips", priority: "high", dueDate: addDays(today, 20), assignee: lea, status: "in_progress" },
    { title: "Trouver une nouvelle plante pour le salon", category: "shopping", priority: "low", dueDate: null, assignee: null },
    { title: "Regarder la trilogie du Parrain", category: "movies", priority: "low", dueDate: null, assignee: null },
    { title: "Idée : week-end en Bretagne au printemps", category: "ideas", priority: "medium", dueDate: null, assignee: null },
    { title: "Faire une liste des cadeaux de Noël", category: "general", priority: "medium", dueDate: addDays(today, 40), assignee: hugo, status: "in_progress" },
  ] as const;
  for (const task of tasks) {
    await createTask(workspaceId, lea!.id, {
      title: task.title,
      description: null,
      categoryId: categories.get(task.category) ?? null,
      priority: task.priority,
      status: "status" in task ? task.status : "todo",
      dueDate: task.dueDate,
      assignedToId: task.assignee?.id ?? null,
    });
  }

  console.info("→ Événements");
  const events = [
    { title: `Anniversaire de ${partnerName}`, type: "birthday", allDay: true, startDay: addDays(today, 9).replace(/^\d{4}/, "1994"), recurrence: "yearly", reminderMinutes: 7 * 1440 },
    { title: "Notre anniversaire", type: "important_date", allDay: true, startDay: "2021-06-12", recurrence: "yearly", reminderMinutes: 7 * 1440 },
    { title: "Dîner chez Camille et Théo", type: "appointment", allDay: false, startDay: addDays(today, 2), startTime: "20:00", location: "Montreuil", reminderMinutes: 1440 },
    { title: "Concert au Trianon", type: "concert", allDay: false, startDay: addDays(today, 16), startTime: "20:30", location: "80 Bd de Rochechouart, Paris", reminderMinutes: 1440 },
    { title: "Cours de céramique", type: "activity", allDay: false, startDay: addDays(today, 6), startTime: "10:00", location: "Atelier Terre & Feu", reminderMinutes: 180 },
  ] as const;
  for (const event of events) {
    await createEvent(workspaceId, lea!.id, {
      title: event.title,
      description: null,
      type: event.type,
      allDay: event.allDay,
      startDay: event.startDay,
      startTime: "startTime" in event ? event.startTime : null,
      endDay: null,
      endTime: null,
      location: "location" in event ? event.location : null,
      recurrence: "recurrence" in event ? event.recurrence : "none",
      reminderMinutes: event.reminderMinutes,
    });
  }

  console.info("→ Films");
  const movies = [
    { title: "Past Lives", year: 2023, genres: ["Drame", "Romance"], runtime: 106, status: "watched", ratings: [9, 8] },
    { title: "Perfect Days", year: 2023, genres: ["Drame"], runtime: 124, status: "watched", ratings: [8, 9] },
    { title: "Le Fabuleux Destin d'Amélie Poulain", year: 2001, genres: ["Comédie", "Romance"], runtime: 122, status: "watched", ratings: [8, 7] },
    { title: "In the Mood for Love", year: 2000, genres: ["Drame", "Romance"], runtime: 98, status: "watchlist" },
    { title: "Anatomie d'une chute", year: 2023, genres: ["Drame", "Thriller"], runtime: 151, status: "watchlist" },
    { title: "Le Voyage de Chihiro", year: 2001, genres: ["Animation", "Fantastique"], runtime: 125, status: "watchlist" },
  ] as const;
  for (const movie of movies) {
    const created = await addManualMovie(workspaceId, lea!.id, { ...movie, genres: [...movie.genres], overview: null });
    if ("ratings" in movie) {
      await reviewMovie(workspaceId, lea!.id, created.id, movie.ratings[0], null);
      await reviewMovie(workspaceId, hugo!.id, created.id, movie.ratings[1], null);
    }
  }

  console.info("→ Voyage et réservations");
  const start = addDays(today, 38);
  const end = addDays(start, 5);
  const trip = await createTrip(workspaceId, lea!.id, {
    title: "Rome",
    destination: "Rome, Italie",
    startDate: start,
    endDate: end,
    description: "Pâtes, ruelles du Trastevere et coucher de soleil depuis le Janicule.",
    latitude: 41.9028,
    longitude: 12.4964,
  });
  const base = { location: null, origin: null, destination: null, provider: null, confirmationNumber: null, price: null, currency: "EUR", url: null, notes: null, tripId: trip.id, addToCalendar: true, endDate: null, endTime: null };
  await createReservation(workspaceId, lea!.id, { ...base, title: "Vol Paris → Rome", type: "flight", date: start, time: "07:45", origin: "Paris CDG", destination: "Rome FCO", provider: "Air France", confirmationNumber: "XK7P2Q", price: 189.4 });
  await createReservation(workspaceId, lea!.id, { ...base, title: "Hotel Santa Maria", type: "hotel", date: start, time: "15:00", endDate: end, endTime: "11:00", location: "Vicolo del Piede 2, Rome", provider: "Hotel Santa Maria", confirmationNumber: "HSM-48213", price: 742 });
  await createReservation(workspaceId, lea!.id, { ...base, title: "Dîner chez Roscioli", type: "restaurant", date: addDays(start, 1), time: "20:00", location: "Via dei Giubbonari 21, Rome" });
  await createReservation(workspaceId, lea!.id, { ...base, title: "Musées du Vatican", type: "activity", date: addDays(start, 2), time: "09:30", provider: "Musei Vaticani", confirmationNumber: "MV-2210-77", price: 40 });
  await createReservation(workspaceId, lea!.id, { ...base, title: "Vol Rome → Paris", type: "flight", date: end, time: "18:10", origin: "Rome FCO", destination: "Paris CDG", provider: "Air France", confirmationNumber: "XK7P2Q", price: 0 });
  await createReservation(workspaceId, lea!.id, { ...base, tripId: null, title: "Concert au Trianon", type: "concert", date: addDays(today, 16), time: "20:30", location: "80 Bd de Rochechouart, Paris", provider: "Fnac Spectacles", price: 78, addToCalendar: false });
  const pastTrip = await createTrip(workspaceId, lea!.id, {
    title: "Lisbonne",
    destination: "Lisbonne, Portugal",
    startDate: "2023-09-18",
    endDate: "2023-09-24",
    description: "Notre premier voyage.",
    latitude: 38.7223,
    longitude: -9.1393,
  });

  console.info("→ Photos (images abstraites générées)");
  const album = await createAlbum(workspaceId, lea!.id, { title: "Lisbonne", description: "Septembre 2023" });
  const photoIds: string[] = [];
  for (let i = 0; i < 12; i++) {
    const photo = await uploadPhoto(
      workspaceId,
      i % 2 ? hugo!.id : lea!.id,
      { buffer: await abstractImage(i), name: `souvenir-${String(i + 1).padStart(2, "0")}.jpg` },
      i < 6 ? { albumId: album.id, tripId: pastTrip.id } : {},
    );
    const takenAt = i < 6 ? fromLocalInput(`2023-09-${19 + (i % 5)}`, `${10 + i}:15`) : fromLocalInput(addDays(today, -i * 21), "18:30");
    await db.exec(sql`UPDATE photos SET taken_at = ${takenAt}, location = ${i < 6 ? "Lisbonne" : null} WHERE id = ${photo.id}`);
    photoIds.push(photo.id);
  }

  console.info("→ Moments");
  await saveMilestone(workspaceId, lea!.id, { title: "Première rencontre", description: "Un concert, une conversation qui ne s'arrêtait plus.", date: "2021-06-12", photoId: null });
  await saveMilestone(workspaceId, lea!.id, { title: "Notre premier appartement", description: null, date: "2022-09-01", photoId: photoIds[8] ?? null });
  await saveMilestone(workspaceId, hugo!.id, { title: "Coucher de soleil à Lisbonne", description: "Depuis le Miradouro da Senhora do Monte.", date: "2023-09-21", photoId: photoIds[2] ?? null });

  console.info("→ Défis et activités");
  for (const challenge of [
    { title: "Une nouvelle recette chaque semaine", description: "Pendant un mois, une recette jamais testée chaque dimanche.", difficulty: "medium", duration: "1 mois", reward: "Un dîner au restaurant", status: "in_progress" },
    { title: "Une semaine sans écrans le soir", description: null, difficulty: "hard", duration: "1 semaine", reward: "Un week-end surprise", status: "todo" },
    { title: "Visiter un musée par mois", description: null, difficulty: "easy", duration: "3 mois", reward: null, status: "done" },
  ] as const) {
    await db.exec(sql`
      INSERT INTO challenges (workspace_id, title, description, difficulty, duration, reward, status, started_at, completed_at, created_by_id)
      VALUES (${workspaceId}, ${challenge.title}, ${challenge.description}, ${challenge.difficulty}, ${challenge.duration}, ${challenge.reward},
              ${challenge.status}, ${challenge.status === "todo" ? null : new Date()}, ${challenge.status === "done" ? new Date() : null}, ${lea!.id})`);
  }
  await db.exec(sql`UPDATE activities SET done_count = 1, last_done_at = now() WHERE workspace_id = ${workspaceId} AND label IN ('Cinéma', 'Balade', 'Musée')`);

  await evaluateBadges(workspaceId);
  console.info(`\n✓ Données de démonstration ajoutées à l'espace de ${users.map((u) => u.name).join(" et ")}.`);
}

main()
  .catch((error) => {
    console.error("Seed impossible :", error);
    process.exitCode = 1;
  })
  .finally(() => pool().end());
