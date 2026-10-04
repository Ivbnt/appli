import "server-only";
import { formatDate, formatDay } from "@/lib/dates";
import { PLACE_CATEGORIES, RESERVATION_TYPES, type PlaceCategory, type ReservationType } from "@/lib/domain";
import type { SearchResult } from "@/lib/search";
import { db, sql } from "../db";

/** Échappe les caractères spéciaux de LIKE. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

type Row = { kind: SearchResult["kind"]; id: string; title: string; extra: string | null; at: Date | string | null };

/** Recherche globale, limitée à l'espace courant (workspaceId issu de la session). */
export async function searchWorkspace(workspaceId: string, term: string): Promise<SearchResult[]> {
  const q = likePattern(term.trim().slice(0, 100));
  const rows = await db.many<Row>(sql`
    (SELECT 'place' AS kind, id, name AS title, category AS extra, NULL::timestamptz AS at FROM locations
      WHERE workspace_id = ${workspaceId} AND (name ILIKE ${q} OR address ILIKE ${q} OR notes ILIKE ${q})
      ORDER BY updated_at DESC LIMIT 5)
    UNION ALL
    (SELECT 'task', id, title, status, NULL FROM tasks
      WHERE workspace_id = ${workspaceId} AND archived_at IS NULL AND (title ILIKE ${q} OR description ILIKE ${q})
      ORDER BY updated_at DESC LIMIT 5)
    UNION ALL
    (SELECT 'event', id, title, NULL, start_date FROM calendar_events
      WHERE workspace_id = ${workspaceId} AND (title ILIKE ${q} OR location ILIKE ${q} OR description ILIKE ${q})
      ORDER BY start_date DESC LIMIT 5)
    UNION ALL
    (SELECT 'movie', id, title, year::text, NULL FROM movies
      WHERE workspace_id = ${workspaceId} AND (title ILIKE ${q} OR notes ILIKE ${q})
      ORDER BY updated_at DESC LIMIT 5)
    UNION ALL
    (SELECT 'photo', id, COALESCE(description, original_name), location, COALESCE(taken_at, created_at) FROM photos
      WHERE workspace_id = ${workspaceId} AND (description ILIKE ${q} OR location ILIKE ${q} OR original_name ILIKE ${q})
      ORDER BY created_at DESC LIMIT 5)
    UNION ALL
    (SELECT 'trip', id, title, destination || '|' || start_date::text, NULL FROM trips
      WHERE workspace_id = ${workspaceId} AND (title ILIKE ${q} OR destination ILIKE ${q} OR description ILIKE ${q})
      ORDER BY start_date DESC LIMIT 5)
    UNION ALL
    (SELECT 'reservation', id, title, type, starts_at FROM reservations
      WHERE workspace_id = ${workspaceId}
        AND (title ILIKE ${q} OR provider ILIKE ${q} OR confirmation_number ILIKE ${q} OR location ILIKE ${q})
      ORDER BY starts_at DESC LIMIT 5)`);

  return rows.map((row): SearchResult => {
    switch (row.kind) {
      case "place":
        return { ...base(row), subtitle: PLACE_CATEGORIES[row.extra as PlaceCategory] ?? null, href: `/map?place=${row.id}` };
      case "task":
        return { ...base(row), subtitle: row.extra === "done" ? "Terminée" : null, href: `/tasks?task=${row.id}` };
      case "event":
        return { ...base(row), subtitle: row.at ? formatDate(row.at, "medium") : null, href: `/calendar?event=${row.id}` };
      case "movie":
        return { ...base(row), subtitle: row.extra, href: `/movies?movie=${row.id}` };
      case "photo":
        return { ...base(row), subtitle: row.extra ?? (row.at ? formatDate(row.at, "medium") : null), href: `/memories?photo=${row.id}` };
      case "trip": {
        const [destination, start] = (row.extra ?? "").split("|");
        return { ...base(row), subtitle: start ? `${destination} · ${formatDay(start, "medium")}` : destination ?? null, href: `/trips/${row.id}` };
      }
      case "reservation":
        return {
          ...base(row),
          subtitle: [RESERVATION_TYPES[row.extra as ReservationType], row.at ? formatDate(row.at, "medium") : null].filter(Boolean).join(" · "),
          href: `/trips/reservations?reservation=${row.id}`,
        };
    }
  });
}

const base = (row: Row) => ({ kind: row.kind, id: row.id, title: row.title });
