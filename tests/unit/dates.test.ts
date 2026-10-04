import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysUntil, formatDayRange, fromLocalInput, relativeDay, startOfWeek, toISODay, toLocalInput } from "@/lib/dates";
import { occurrenceInYear } from "@/server/services/calendar";

describe("dates", () => {
  it("interprète la saisie dans le fuseau de l'application, y compris en heure d'été", () => {
    expect(fromLocalInput("2027-04-12", "20:00").toISOString()).toBe("2027-04-12T18:00:00.000Z");
    expect(fromLocalInput("2027-01-12", "20:00").toISOString()).toBe("2027-01-12T19:00:00.000Z");
    expect(toLocalInput(new Date("2027-04-12T18:00:00Z"))).toEqual({ date: "2027-04-12", time: "20:00" });
  });

  it("calcule le jour calendaire local d'un instant", () => {
    // 23h30 UTC le 31 décembre = 0h30 le 1er janvier à Paris
    expect(toISODay(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("formate les plages de dates comme dans l'exemple « 12 — 18 avril 2027 »", () => {
    expect(formatDayRange("2027-04-12", "2027-04-18")).toBe("12 — 18 avril 2027");
    expect(formatDayRange("2027-03-28", "2027-04-02")).toBe("28 mars — 2 avril 2027");
  });

  it("libellés relatifs", () => {
    const now = new Date("2026-10-04T10:00:00Z");
    expect(relativeDay("2026-10-04", now)).toBe("Aujourd'hui");
    expect(relativeDay("2026-10-05", now)).toBe("Demain");
    expect(relativeDay("2026-10-16", now)).toBe("Dans 12 jours");
    expect(daysUntil("2026-10-01", now)).toBe(-3);
  });

  it("arithmétique calendaire", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28");
  });

  it("les anniversaires du 29 février tombent le 28 les années non bissextiles", () => {
    const event = { startDate: fromLocalInput("2024-02-29", "00:00"), endDate: null };
    expect(toISODay(occurrenceInYear(event, 2025).start)).toBe("2025-02-28");
    expect(toISODay(occurrenceInYear(event, 2028).start)).toBe("2028-02-29");
  });
});
