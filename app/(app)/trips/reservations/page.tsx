import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ReservationsView } from "@/components/trips/reservations-view";
import { TabLinks } from "@/components/ui/tabs";
import { requireWorkspace } from "@/server/auth/guards";
import { db, sql } from "@/server/db";
import { listReservations } from "@/server/services/trips";

export const metadata: Metadata = { title: "Réservations" };

export default async function ReservationsPage() {
  const ctx = await requireWorkspace();
  const [reservations, trips] = await Promise.all([
    listReservations(ctx.workspace.id),
    db.many<{ id: string; title: string; startDate: string }>(sql`
      SELECT id, title, start_date FROM trips WHERE workspace_id = ${ctx.workspace.id} ORDER BY start_date DESC`),
  ]);
  return (
    <PageContainer>
      <PageHeader title="Voyages" description="Billets et réservations, avec leurs documents.">
        <TabLinks
          items={[
            { href: "/trips", label: "Voyages", exact: true },
            { href: "/trips/reservations", label: "Réservations" },
          ]}
        />
      </PageHeader>
      <Suspense>
        <ReservationsView reservations={reservations} trips={trips} />
      </Suspense>
    </PageContainer>
  );
}
