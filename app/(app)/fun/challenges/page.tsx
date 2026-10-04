import type { Metadata } from "next";
import { Challenges } from "@/components/fun/challenges";
import { requireWorkspace } from "@/server/auth/guards";
import { listChallenges } from "@/server/services/fun";

export const metadata: Metadata = { title: "Défis" };

export default async function ChallengesPage() {
  const ctx = await requireWorkspace();
  return <Challenges initialChallenges={await listChallenges(ctx.workspace.id)} />;
}
