import { describe, expect, it } from "vitest";
import { db, sql } from "@/server/db";
import { UserError } from "@/server/errors";
import { createEvent, deleteEvent, listOccurrences, updateEvent } from "@/server/services/calendar";
import { answerQuestion, getWhoOfUs } from "@/server/services/fun";
import { addManualMovie, deleteMovie, reviewMovie } from "@/server/services/movies";
import { createAlbum, deletePhotos, movePhotosToAlbum } from "@/server/services/photos";
import { createPlace, deletePlace, listPlaces, updatePlace } from "@/server/services/places";
import { searchWorkspace } from "@/server/services/search";
import { createTask, deleteTask, listActiveTasks, listCategories, moveTask, updateTask } from "@/server/services/tasks";
import { createReservation, createTrip, getTrip } from "@/server/services/trips";
import { createCouple } from "./helpers";

/**
 * Le point le plus important de l'application : un espace ne peut jamais lire
 * ni modifier les données d'un autre espace, même en connaissant leurs identifiants.
 */
describe("isolation entre espaces", () => {
  it("tâches : invisibles, non modifiables, non supprimables depuis un autre espace", async () => {
    const a = await createCouple("Alice");
    const b = await createCouple("Bruno");
    const task = await createTask(a.workspaceId, a.user.id, { title: "Secret A", description: null, categoryId: null, priority: "medium", status: "todo", dueDate: null, assignedToId: null });

    expect((await listActiveTasks(b.workspaceId)).some((t) => t.id === task.id)).toBe(false);
    await expect(updateTask(b.workspaceId, task.id, { title: "piraté", description: null, categoryId: null, priority: "low", status: "done", dueDate: null, assignedToId: null })).rejects.toBeInstanceOf(UserError);
    await expect(deleteTask(b.workspaceId, task.id)).rejects.toBeInstanceOf(UserError);
    await expect(moveTask(b.workspaceId, { id: task.id, status: "done", beforeId: null, afterId: null })).rejects.toBeInstanceOf(UserError);
    expect((await listActiveTasks(a.workspaceId)).find((t) => t.id === task.id)?.title).toBe("Secret A");
  });

  it("tâches : impossible d'utiliser la catégorie ou d'assigner un membre d'un autre espace", async () => {
    const a = await createCouple("Alice");
    const b = await createCouple("Bruno");
    const foreignCategory = (await listCategories(b.workspaceId))[0]!;
    const base = { title: "T", description: null, priority: "medium", status: "todo", dueDate: null } as const;
    await expect(createTask(a.workspaceId, a.user.id, { ...base, categoryId: foreignCategory.id, assignedToId: null })).rejects.toBeInstanceOf(UserError);
    await expect(createTask(a.workspaceId, a.user.id, { ...base, categoryId: null, assignedToId: b.user.id })).rejects.toBeInstanceOf(UserError);
  });

  it("la base refuse elle-même une référence vers un autre espace (clés étrangères composites)", async () => {
    const a = await createCouple("Alice");
    const b = await createCouple("Bruno");
    const foreignCategory = (await listCategories(b.workspaceId))[0]!;
    await expect(
      db.exec(sql`INSERT INTO tasks (workspace_id, title, category_id) VALUES (${a.workspaceId}, 'x', ${foreignCategory.id})`),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("lieux, événements, films", async () => {
    const a = await createCouple("Alice");
    const b = await createCouple("Bruno");
    const place = await createPlace(a.workspaceId, a.user.id, { name: "Lieu A", address: null, latitude: 48.85, longitude: 2.35, category: "cafe", status: "visited", visitedAt: null, rating: 4, notes: null, externalUrl: null, tripId: null });
    expect(await listPlaces(b.workspaceId)).toHaveLength(0);
    await expect(updatePlace(b.workspaceId, place.id, { name: "x", address: null, latitude: 0, longitude: 0, category: "bar", status: "visited", visitedAt: null, rating: null, notes: null, externalUrl: null, tripId: null })).rejects.toBeInstanceOf(UserError);
    await expect(deletePlace(b.workspaceId, place.id)).rejects.toBeInstanceOf(UserError);

    const event = await createEvent(a.workspaceId, a.user.id, { title: "Dîner A", description: null, type: "restaurant", allDay: false, startDay: "2030-01-10", startTime: "20:00", endDay: null, endTime: null, location: null, recurrence: "none", reminderMinutes: null });
    expect(await listOccurrences(b.workspaceId, new Date("2030-01-01"), new Date("2030-02-01"))).toHaveLength(0);
    await expect(updateEvent(b.workspaceId, event.id, { title: "x", description: null, type: "other", allDay: true, startDay: "2030-01-10", startTime: null, endDay: null, endTime: null, location: null, recurrence: "none", reminderMinutes: null })).rejects.toBeInstanceOf(UserError);
    await expect(deleteEvent(b.workspaceId, event.id)).rejects.toBeInstanceOf(UserError);

    const movie = await addManualMovie(a.workspaceId, a.user.id, { title: "Film A", year: 2020, genres: [], runtime: null, overview: null, status: "watchlist" });
    await expect(reviewMovie(b.workspaceId, b.user.id, movie.id, 10, null)).rejects.toBeInstanceOf(UserError);
    await expect(deleteMovie(b.workspaceId, movie.id)).rejects.toBeInstanceOf(UserError);
  });

  it("voyages, réservations et albums d'un autre espace sont inaccessibles", async () => {
    const a = await createCouple("Alice");
    const b = await createCouple("Bruno");
    const trip = await createTrip(a.workspaceId, a.user.id, { title: "Rome", destination: "Rome", startDate: "2030-04-12", endDate: "2030-04-18", description: null, latitude: null, longitude: null });
    expect(await getTrip(b.workspaceId, trip.id)).toBeNull();
    const reservation = { title: "Vol", type: "flight", date: "2030-04-12", time: "07:45", endDate: null, endTime: null, location: null, origin: null, destination: null, provider: null, confirmationNumber: null, price: null, currency: "EUR", url: null, notes: null, addToCalendar: true } as const;
    await expect(createReservation(b.workspaceId, b.user.id, { ...reservation, tripId: trip.id })).rejects.toBeInstanceOf(UserError);

    const album = await createAlbum(a.workspaceId, a.user.id, { title: "Album A", description: null });
    const photoId = (await db.one<{ id: string }>(sql`
      INSERT INTO photos (workspace_id, storage_key, thumbnail_key, preview_key, original_name, mime_type, size_bytes)
      VALUES (${b.workspaceId}, 'w/b/o', 'w/b/t', 'w/b/p', 'b.jpg', 'image/jpeg', 1) RETURNING id`)).id;
    // Bruno ne peut pas ranger sa photo dans l'album d'Alice…
    await expect(movePhotosToAlbum(b.workspaceId, [photoId], album.id)).rejects.toBeInstanceOf(UserError);
    // … et Alice ne peut pas supprimer la photo de Bruno.
    expect(await deletePhotos(a.workspaceId, [photoId])).toBe(0);
  });

  it("la recherche globale ne renvoie que les données de l'espace", async () => {
    const a = await createCouple("Alice");
    const b = await createCouple("Bruno");
    await createTask(a.workspaceId, a.user.id, { title: "Mot-clé-unique-zebre", description: null, categoryId: null, priority: "medium", status: "todo", dueDate: null, assignedToId: null });
    expect(await searchWorkspace(a.workspaceId, "zebre")).toHaveLength(1);
    expect(await searchWorkspace(b.workspaceId, "zebre")).toHaveLength(0);
    // Les caractères spéciaux de LIKE sont échappés.
    expect(await searchWorkspace(a.workspaceId, "%")).toHaveLength(0);
  });

  it("jeux : impossible de répondre à une question d'un autre espace", async () => {
    const a = await createCouple("Alice");
    const b = await createCouple("Bruno");
    const question = (await getWhoOfUs(a.workspaceId, a.user.id))[0]!;
    await expect(answerQuestion(b.workspaceId, b.user.id, [b.user.id], question.id, b.user.id)).rejects.toBeInstanceOf(UserError);
    // Et la réponse doit désigner un membre de l'espace.
    await expect(answerQuestion(a.workspaceId, a.user.id, [a.user.id], question.id, b.user.id)).rejects.toBeInstanceOf(UserError);
  });
});
