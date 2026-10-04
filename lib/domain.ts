/**
 * Vocabulaire métier partagé entre le serveur et l'interface :
 * valeurs stockées en base et libellés affichés.
 */

const labels = <T extends string>(map: Record<T, string>) => map;
const keysOf = <T extends string>(map: Record<T, string>) => Object.keys(map) as [T, ...T[]];

export const PLACE_CATEGORIES = labels({
  restaurant: "Restaurant",
  cafe: "Café",
  bar: "Bar",
  hotel: "Hôtel",
  travel: "Voyage",
  activity: "Activité",
  other: "Autre",
});
export type PlaceCategory = keyof typeof PLACE_CATEGORIES;
export const PLACE_CATEGORY_VALUES = keysOf(PLACE_CATEGORIES);

export const PLACE_STATUSES = labels({ visited: "Visité", want_to_visit: "À visiter" });
export type PlaceStatus = keyof typeof PLACE_STATUSES;
export const PLACE_STATUS_VALUES = keysOf(PLACE_STATUSES);

export const TASK_PRIORITIES = labels({ low: "Basse", medium: "Normale", high: "Haute" });
export type TaskPriority = keyof typeof TASK_PRIORITIES;
export const TASK_PRIORITY_VALUES = keysOf(TASK_PRIORITIES);

export const TASK_STATUSES = labels({ todo: "À faire", in_progress: "En cours", done: "Terminé" });
export type TaskStatus = keyof typeof TASK_STATUSES;
export const TASK_STATUS_VALUES = keysOf(TASK_STATUSES);

export const EVENT_TYPES = labels({
  appointment: "Rendez-vous",
  birthday: "Anniversaire",
  important_date: "Date importante",
  trip: "Voyage",
  restaurant: "Restaurant",
  concert: "Concert",
  activity: "Activité",
  reservation: "Réservation",
  other: "Autre",
});
export type EventType = keyof typeof EVENT_TYPES;
export const EVENT_TYPE_VALUES = keysOf(EVENT_TYPES);

export const RECURRENCES = labels({ none: "Une seule fois", yearly: "Chaque année" });
export type Recurrence = keyof typeof RECURRENCES;
export const RECURRENCE_VALUES = keysOf(RECURRENCES);

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Aucun rappel" },
  { value: 0, label: "Au moment de l'événement" },
  { value: 60, label: "1 heure avant" },
  { value: 180, label: "3 heures avant" },
  { value: 1440, label: "La veille" },
  { value: 4320, label: "3 jours avant" },
  { value: 10080, label: "Une semaine avant" },
];

export const MOVIE_STATUSES = labels({ watchlist: "À regarder", watched: "Regardé" });
export type MovieStatus = keyof typeof MOVIE_STATUSES;
export const MOVIE_STATUS_VALUES = keysOf(MOVIE_STATUSES);

export const RESERVATION_TYPES = labels({
  flight: "Avion",
  train: "Train",
  hotel: "Hôtel",
  restaurant: "Restaurant",
  concert: "Concert",
  activity: "Activité",
  rental: "Location",
  other: "Autre",
});
export type ReservationType = keyof typeof RESERVATION_TYPES;
export const RESERVATION_TYPE_VALUES = keysOf(RESERVATION_TYPES);

/** Sections d'un voyage, dans l'ordre d'affichage. */
export const TRIP_SECTIONS: { key: string; label: string; types: ReservationType[] }[] = [
  { key: "transport", label: "Transport", types: ["flight", "train", "rental"] },
  { key: "hotel", label: "Hébergement", types: ["hotel"] },
  { key: "restaurant", label: "Restaurants", types: ["restaurant"] },
  { key: "activity", label: "Activités", types: ["activity", "concert"] },
  { key: "other", label: "Autres réservations", types: ["other"] },
];

export const ACTIVITY_POOLS = labels({ tonight: "Ce soir, on fait…", wheel: "Roue des activités" });
export type ActivityPool = keyof typeof ACTIVITY_POOLS;


export type QuizKind = "who_of_us";
export type ThemePreference = "light" | "dark" | "system";
export type MemberRole = "owner" | "member";
