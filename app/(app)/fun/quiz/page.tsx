import type { Metadata } from "next";
import { QuizList } from "@/components/fun/quiz";
import { requireWorkspace } from "@/server/auth/guards";
import { listQuizzes } from "@/server/services/fun";

export const metadata: Metadata = { title: "Quiz de couple" };

export default async function QuizListPage() {
  const ctx = await requireWorkspace();
  return <QuizList quizzes={await listQuizzes(ctx.workspace.id, ctx.user.id)} />;
}
