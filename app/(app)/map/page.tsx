import type { Metadata } from "next";
import { Suspense } from "react";
import { PlacesView } from "@/components/places/places-view";
import { requireWorkspace } from "@/server/auth/guards";
import { db, sql } from "@/server/db";
import { mapStyles } from "@/server/integrations/geocoding";
import { listPlaces } from "@/server/services/places";

export const metadata: Metadata = { title: "Carte" };

export default async function MapPage() {
  const ctx = await requireWorkspace();
  const [places, trips] = await Promise.all([
    listPlaces(ctx.workspace.id),
    db.many<{ id: string; title: string }>(sql`SELECT id, title FROM trips WHERE workspace_id = ${ctx.workspace.id} ORDER BY start_date DESC`),
  ]);

  return (
    <Suspense>
      <PlacesView initialPlaces={places} styles={mapStyles()} trips={trips} />
    </Suspense>
  );
}
