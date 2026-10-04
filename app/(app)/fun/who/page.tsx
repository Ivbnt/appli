import type { Metadata } from "next";
import { WhoOfUs } from "@/components/fun/who-of-us";
import { requireWorkspace } from "@/server/auth/guards";
import { getWhoOfUs } from "@/server/services/fun";

export const metadata: Metadata = { title: "Qui de nous deux ?" };

export default async function WhoPage() {
  const ctx = await requireWorkspace();
  return <WhoOfUs questions={await getWhoOfUs(ctx.workspace.id, ctx.user.id)} />;
}
