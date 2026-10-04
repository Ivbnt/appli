import { addDays, toISODay } from "@/lib/dates";
import type { Occurrence } from "./types";

/** Jours (AAAA-MM-JJ) couverts par une occurrence, dans le fuseau de l'application. */
export function occurrenceDays(occurrence: Occurrence): string[] {
  const start = toISODay(occurrence.occurrenceStart);
  if (!occurrence.occurrenceEnd) return [start];
  // Fin à minuit pile = fin exclusive pour un événement non « journée entière ».
  const endInstant = occurrence.allDay
    ? occurrence.occurrenceEnd
    : new Date(occurrence.occurrenceEnd.getTime() - 1);
  const end = toISODay(endInstant);
  const days: string[] = [];
  for (let day = start; day <= end && days.length < 62; day = addDays(day, 1)) days.push(day);
  return days.length ? days : [start];
}

export function groupByDay(occurrences: Occurrence[]): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>();
  for (const occurrence of occurrences) {
    for (const day of occurrenceDays(occurrence)) {
      const list = map.get(day) ?? [];
      list.push(occurrence);
      map.set(day, list);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.occurrenceStart.getTime() - b.occurrenceStart.getTime());
  }
  return map;
}
