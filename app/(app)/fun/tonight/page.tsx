import type { Metadata } from "next";
import { Tonight } from "@/components/fun/tonight";
import { requireWorkspace } from "@/server/auth/guards";
import { listActivities } from "@/server/services/fun";

export const metadata: Metadata = { title: "Ce soir, on fait…" };

export default async function TonightPage() {
  const ctx = await requireWorkspace();
  return <Tonight initialActivities={await listActivities(ctx.workspace.id, "tonight")} />;
}
