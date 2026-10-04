import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { TripsView } from "@/components/trips/trips-view";
import { TabLinks } from "@/components/ui/tabs";
import { requireWorkspace } from "@/server/auth/guards";
import { listTrips } from "@/server/services/trips";

export const metadata: Metadata = { title: "Voyages" };

const TRIP_TABS = [
  { href: "/trips", label: "Voyages", exact: true },
  { href: "/trips/reservations", label: "Réservations" },
];

export default async function TripsPage() {
  const ctx = await requireWorkspace();
  return (
    <PageContainer wide>
      <PageHeader title="Voyages" description="Vos prochains départs et ceux qui restent en mémoire.">
        <TabLinks items={TRIP_TABS} />
      </PageHeader>
      <Suspense>
        <TripsView trips={await listTrips(ctx.workspace.id)} />
      </Suspense>
    </PageContainer>
  );
}
