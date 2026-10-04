import type { Metadata } from "next";
import { Wheel } from "@/components/fun/wheel";
import { requireWorkspace } from "@/server/auth/guards";
import { listActivities } from "@/server/services/fun";

export const metadata: Metadata = { title: "Roue des activités" };

export default async function WheelPage() {
  const ctx = await requireWorkspace();
  return <Wheel initialActivities={await listActivities(ctx.workspace.id, "wheel")} />;
}
