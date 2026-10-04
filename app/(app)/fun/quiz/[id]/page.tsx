import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuizPlay } from "@/components/fun/quiz";
import { requireWorkspace } from "@/server/auth/guards";
import { getQuiz } from "@/server/services/fun";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({ params }: PageProps<"/fun/quiz/[id]">) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const quiz = await getQuiz(ctx.workspace.id, ctx.user.id, id);
  if (!quiz) notFound();
  return <QuizPlay quiz={quiz} />;
}
