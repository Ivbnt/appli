import type { Metadata } from "next";
import { PartyGame } from "@/components/fun/party-game";
import { requireWorkspace } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Défis de soirée" };

export default async function PartyPage() {
  const ctx = await requireWorkspace();
  return <PartyGame players={ctx.members.map((m) => m.name)} />;
}
