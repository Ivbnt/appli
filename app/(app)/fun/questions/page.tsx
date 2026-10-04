import type { Metadata } from "next";
import { QuestionsGame } from "@/components/fun/questions-game";
import { requireWorkspace } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Questions de couple" };

export default async function QuestionsPage() {
  await requireWorkspace();
  return <QuestionsGame />;
}
