export type SearchResultKind = "place" | "task" | "event" | "movie" | "photo" | "trip" | "reservation";

export type SearchResult = {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};
