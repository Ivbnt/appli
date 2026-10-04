import { TZDate } from "@date-fns/tz";

/**
 * Dates et fuseau horaire.
 *
 * - Les instants (rendez-vous, réservations) sont stockés en UTC et affichés dans le
 *   fuseau de l'application (APP_TIMEZONE), identique côté serveur et navigateur :
 *   pas de décalage ni d'erreur d'hydratation.
 * - Les dates calendaires (anniversaires, voyages, échéances) sont des chaînes
 *   « AAAA-MM-JJ » : elles n'ont pas de fuseau et ne se décalent jamais d'un jour.
 */

let timezone = "Europe/Paris";

export function configureTimezone(tz: string) {
  timezone = tz;
}

export function appTimezone() {
  return timezone;
}

const LOCALE = "fr-FR";
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(options: Intl.DateTimeFormatOptions, tz = timezone) {
  const key = tz + JSON.stringify(options);
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(LOCALE, { timeZone: tz, ...options });
    formatterCache.set(key, cached);
  }
  return cached;
}

const asDate = (value: Date | string) => (typeof value === "string" ? new Date(value) : value);

/** « AAAA-MM-JJ » → Date à minuit UTC (pour un formatage sans décalage). */
function dateOnlyToUtc(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export type DateStyle = "short" | "medium" | "long" | "full" | "dayMonth" | "monthYear" | "weekdayShort";

const STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: "numeric", month: "short" },
  medium: { day: "numeric", month: "short", year: "numeric" },
  long: { day: "numeric", month: "long", year: "numeric" },
  full: { weekday: "long", day: "numeric", month: "long" },
  dayMonth: { day: "numeric", month: "long" },
  monthYear: { month: "long", year: "numeric" },
  weekdayShort: { weekday: "short", day: "numeric", month: "short" },
};

/** Formate un instant dans le fuseau de l'application. */
export function formatDate(value: Date | string, style: DateStyle = "medium"): string {
  return formatter(STYLES[style]).format(asDate(value));
}

/** Formate une date calendaire « AAAA-MM-JJ ». */
export function formatDay(value: string, style: DateStyle = "medium"): string {
  return formatter(STYLES[style], "UTC").format(dateOnlyToUtc(value));
}

export function formatTime(value: Date | string): string {
  return formatter({ hour: "2-digit", minute: "2-digit" }).format(asDate(value));
}

export function formatDateTime(value: Date | string): string {
  return `${formatDate(value, "full")} à ${formatTime(value)}`;
}

/** Date calendaire du jour (AAAA-MM-JJ) dans le fuseau de l'application. */
export function todayISO(now = new Date()): string {
  return toISODay(now);
}

/** Date calendaire (AAAA-MM-JJ) d'un instant, dans le fuseau de l'application. */
export function toISODay(value: Date | string): string {
  const parts = formatter({ year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(asDate(value));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Nombre de jours calendaires entre aujourd'hui et une date (négatif si passée). */
export function daysUntil(day: string, now = new Date()): number {
  return Math.round((dateOnlyToUtc(day).getTime() - dateOnlyToUtc(todayISO(now)).getTime()) / 86_400_000);
}

/** « Aujourd'hui », « Demain », « Dans 12 jours », « Il y a 3 jours »… */
export function relativeDay(day: string, now = new Date()): string {
  const diff = daysUntil(day, now);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  if (diff > 1) return diff < 60 ? `Dans ${diff} jours` : `Dans ${Math.round(diff / 30)} mois`;
  const past = -diff;
  return past < 60 ? `Il y a ${past} jours` : `Il y a ${Math.round(past / 30)} mois`;
}

/** Plage de dates calendaires : « 12 — 18 avril 2027 », « 28 mars — 2 avril 2027 ». */
export function formatDayRange(start: string, end: string): string {
  const [sy, sm] = start.split("-");
  const [ey, em] = end.split("-");
  if (start === end) return formatDay(start, "long");
  if (sy === ey && sm === em) return `${Number(start.slice(8))} — ${formatDay(end, "long")}`;
  if (sy === ey) return `${formatDay(start, "dayMonth")} — ${formatDay(end, "long")}`;
  return `${formatDay(start, "long")} — ${formatDay(end, "long")}`;
}

/** Combine une date et une heure saisies (dans le fuseau de l'application) en instant UTC. */
export function fromLocalInput(day: string, time = "00:00"): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y!, m! - 1, d!, hh ?? 0, mm ?? 0, timezone).getTime());
}

/** Décompose un instant en date et heure locales, pour pré-remplir un formulaire. */
export function toLocalInput(value: Date | string): { date: string; time: string } {
  const zoned = new TZDate(asDate(value).getTime(), timezone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}`,
    time: `${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`,
  };
}

/** Ajoute des jours à une date calendaire. */
export function addDays(day: string, amount: number): string {
  const date = dateOnlyToUtc(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** Jour de la semaine (0 = lundi … 6 = dimanche) d'une date calendaire. */
export function weekdayIndex(day: string): number {
  return (dateOnlyToUtc(day).getUTCDay() + 6) % 7;
}

export function startOfWeek(day: string): string {
  return addDays(day, -weekdayIndex(day));
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function addMonths(day: string, amount: number): string {
  const [y, m] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1 + amount, 1));
  return date.toISOString().slice(0, 10);
}

export function daysInMonth(day: string): number {
  const [y, m] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
}

/** Instant UTC correspondant à minuit (fuseau de l'application) d'une date calendaire. */
export function startOfDayInstant(day: string): Date {
  return fromLocalInput(day, "00:00");
}

export function greeting(now = new Date()): string {
  const hour = Number(formatter({ hour: "numeric", hour12: false }).format(now));
  if (hour >= 5 && hour < 12) return "Bonjour";
  if (hour >= 12 && hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function yearOf(day: string): number {
  return Number(day.slice(0, 4));
}
