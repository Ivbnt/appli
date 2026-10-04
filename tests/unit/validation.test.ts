import { describe, expect, it } from "vitest";
import { registerSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { eventInputSchema } from "@/lib/validation/events";
import { quizQuestionSchema } from "@/lib/validation/fun";
import { reservationInputSchema, tripInputSchema } from "@/lib/validation/trips";
import { reminderSummary, whenLabel } from "@/server/services/reminders";
import { fromLocalInput } from "@/lib/dates";

describe("validation", () => {
  it("normalise l'e-mail et exige un mot de passe de 10 caractères", () => {
    const ok = registerSchema.safeParse({ name: " Léa ", email: " LEA@Exemple.FR ", password: "0123456789" });
    expect(ok.success && ok.data).toMatchObject({ name: "Léa", email: "lea@exemple.fr" });
    expect(registerSchema.safeParse({ name: "Léa", email: "lea@exemple.fr", password: "court" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "", email: "pas-un-email", password: "0123456789" }).success).toBe(false);
  });

  it("vérifie la confirmation du mot de passe", () => {
    expect(resetPasswordSchema.safeParse({ token: "x".repeat(20), password: "0123456789", confirm: "autre" }).success).toBe(false);
  });

  it("refuse un événement qui se termine avant de commencer", () => {
    const base = { title: "Dîner", description: null, type: "restaurant", allDay: false, startDay: "2026-10-10", startTime: "20:00", location: null, recurrence: "none", reminderMinutes: null } as const;
    expect(eventInputSchema.safeParse({ ...base, endDay: "2026-10-09", endTime: "21:00" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, endDay: null, endTime: "22:00" }).success).toBe(true);
    expect(eventInputSchema.safeParse({ ...base, startTime: null, endDay: null, endTime: null }).success).toBe(false);
  });

  it("voyages et réservations", () => {
    expect(tripInputSchema.safeParse({ title: "Rome", destination: "Rome", startDate: "2027-04-18", endDate: "2027-04-12", description: null, latitude: null, longitude: null }).success).toBe(false);
    const reservation = { title: "Vol", type: "flight", date: "2027-04-12", time: "07:45", endDate: null, endTime: null, location: null, origin: "Paris", destination: "Rome", provider: null, confirmationNumber: null, price: 189.4, currency: "EUR", url: "javascript:alert(1)", notes: null, tripId: null, addToCalendar: true } as const;
    expect(reservationInputSchema.safeParse(reservation).success).toBe(false);
    expect(reservationInputSchema.safeParse({ ...reservation, url: "https://airfrance.fr" }).success).toBe(true);
  });

  it("une question de quiz a des réponses distinctes", () => {
    const id = "00000000-0000-0000-0000-000000000000";
    expect(quizQuestionSchema.safeParse({ quizId: id, prompt: "?", options: ["Plage", "plage"] }).success).toBe(false);
    expect(quizQuestionSchema.safeParse({ quizId: id, prompt: "?", options: ["Plage"] }).success).toBe(false);
  });
});

describe("textes des rappels", () => {
  it("correspond aux exemples du cahier des charges", () => {
    const now = new Date("2026-10-04T08:00:00Z");
    const dinner = fromLocalInput("2026-10-05", "20:00");
    expect(`${whenLabel(dinner, now)} : ${reminderSummary({ title: "restaurant", type: "restaurant", allDay: false, location: null }, dinner)}`).toBe("Demain : restaurant à 20h");
    const departure = fromLocalInput("2026-10-07", "00:00");
    expect(`${whenLabel(departure, now)} : ${reminderSummary({ title: "Rome", type: "trip", allDay: true, location: "Rome" }, departure)}`).toBe("Dans 3 jours : départ pour Rome");
  });
});
