import { describe, expect, it } from "vitest";
import { parseAccounts } from "@/lib/accounts";
import { loginSchema } from "@/lib/validation/auth";
import { eventInputSchema } from "@/lib/validation/events";
import { reservationInputSchema, tripInputSchema } from "@/lib/validation/trips";
import { reminderSummary, whenLabel } from "@/server/services/reminders";
import { fromLocalInput } from "@/lib/dates";

describe("validation", () => {
  it("lit la liste des comptes autorisés (ACCOUNTS)", () => {
    expect(parseAccounts("Léa Martin <Lea.Martin@Exemple.FR>, Hugo Petit <hugo@exemple.fr>")).toEqual([
      { name: "Léa Martin", email: "lea.martin@exemple.fr" },
      { name: "Hugo Petit", email: "hugo@exemple.fr" },
    ]);
    expect(parseAccounts("Léa <lea@exemple.fr>;\nHugo <hugo@exemple.fr>")).toHaveLength(2);
    expect(() => parseAccounts("")).toThrow("aucun compte");
    expect(() => parseAccounts("lea@exemple.fr")).toThrow("mal écrit");
    expect(() => parseAccounts("A <a@x.fr>, B <b@x.fr>, C <c@x.fr>")).toThrow("2 au maximum");
    expect(() => parseAccounts("A <a@x.fr>, B <A@x.fr>")).toThrow("deux fois");
  });

  it("normalise l'e-mail de connexion", () => {
    const ok = loginSchema.safeParse({ email: " LEA@Exemple.FR ", password: "x" });
    expect(ok.success && ok.data.email).toBe("lea@exemple.fr");
    expect(loginSchema.safeParse({ email: "pas-un-email", password: "x" }).success).toBe(false);
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
