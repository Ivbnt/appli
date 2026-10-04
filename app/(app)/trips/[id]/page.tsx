import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-header";
import { TripDetail } from "@/components/trips/trip-detail";
import type { PlaceCategory } from "@/lib/domain";
import { requireWorkspace } from "@/server/auth/guards";
import { db, sql } from "@/server/db";
import { getTrip, listReservations } from "@/server/services/trips";

export const metadata: Metadata = { title: "Voyage" };

export default async function TripPage({ params }: PageProps<"/trips/[id]">) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const trip = await getTrip(ctx.workspace.id, id);
  if (!trip) notFound();
  const [reservations, places, trips] = await Promise.all([
    listReservations(ctx.workspace.id, { tripId: trip.id }),
    db.many<{ id: string; name: string; category: PlaceCategory; status: "visited" | "want_to_visit" }>(sql`
      SELECT id, name, category, status FROM locations WHERE workspace_id = ${ctx.workspace.id} AND trip_id = ${trip.id} ORDER BY name`),
    db.many<{ id: string; title: string; startDate: string }>(sql`
      SELECT id, title, start_date FROM trips WHERE workspace_id = ${ctx.workspace.id} ORDER BY start_date DESC`),
  ]);

  return (
    <PageContainer wide>
      <Link href="/trips" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Voyages
      </Link>
      <TripDetail trip={trip} reservations={reservations} places={places} trips={trips} />
    </PageContainer>
  );
}
