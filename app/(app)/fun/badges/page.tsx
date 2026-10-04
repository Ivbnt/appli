import type { Metadata } from "next";
import { Badges } from "@/components/fun/badges";
import { requireWorkspace } from "@/server/auth/guards";
import { listBadgeProgress } from "@/server/services/badges";

export const metadata: Metadata = { title: "Badges" };

export default async function BadgesPage() {
  const ctx = await requireWorkspace();
  return <Badges badges={await listBadgeProgress(ctx.workspace.id)} />;
}
