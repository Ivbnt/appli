"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { useMembers, useShell } from "@/components/layout/shell-context";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addWhoQuestionAction, answerQuestionAction, deleteQuestionAction } from "@/server/actions/fun";
import type { QuestionView } from "@/server/services/fun";

export function WhoOfUs({ questions: initial }: { questions: QuestionView[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const reduce = useReducedMotion();
  const { user } = useShell();
  const members = useMembers();
  const [questions, setQuestions] = React.useState(initial);
  React.useEffect(() => setQuestions(initial), [initial]);
  const [prompt, setPrompt] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const nextIndex = questions.findIndex((q) => q.myAnswer === null);
  const current = nextIndex >= 0 ? questions[nextIndex] : null;
  const answered = questions.filter((q) => q.myAnswer !== null);
  const memberName = (id: string | null) => (id === user.id ? "Vous" : members.find((m) => m.id === id)?.name ?? "—");

  const answer = (question: QuestionView, value: string) => {
    setQuestions((list) => list.map((q) => (q.id === question.id ? { ...q, myAnswer: value } : q)));
    startTransition(async () => {
      const result = await answerQuestionAction({ questionId: question.id, value });
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await addWhoQuestionAction({ prompt });
      if (!result.ok) return void toast.error(result.fieldErrors?.prompt?.[0] ?? result.error);
      setPrompt("");
      router.refresh();
    });
  };

  const remove = async (question: QuestionView) => {
    if (!(await confirm({ title: "Supprimer cette question ?", description: question.prompt, confirmLabel: "Supprimer", destructive: true }))) return;
    const result = await deleteQuestionAction({ questionId: question.id });
    if (!result.ok) return void toast.error(result.error);
    setQuestions((list) => list.filter((q) => q.id !== question.id));
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <AnimatePresence mode="wait">
        {current ? (
          <motion.section
            key={current.id}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-border bg-surface p-6 text-center shadow-sm sm:p-10"
            aria-live="polite"
          >
            <p className="text-xs font-medium text-muted tabular">
              Question {nextIndex + 1} sur {questions.length}
            </p>
            <h2 className="mx-auto mt-4 max-w-md text-2xl font-semibold tracking-tight text-balance">{current.prompt}</h2>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  disabled={pending}
                  onClick={() => answer(current, member.id)}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-border p-5 transition-[border-color,background-color,transform] duration-150 hover:border-border-strong hover:bg-surface-hover active:scale-[0.98]"
                >
                  <Avatar name={member.name} src={member.avatarUrl} size="lg" />
                  <span className="font-medium">{member.id === user.id ? `${member.name} (moi)` : member.name}</span>
                </button>
              ))}
            </div>
            {members.length < 2 && <p className="mt-4 text-xs text-muted">Invitez votre partenaire pour comparer vos réponses.</p>}
          </motion.section>
        ) : questions.length > 0 ? (
          <motion.div key="done" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-border bg-surface p-8 text-center">
            <p className="text-heading">Vous avez répondu à toutes les questions.</p>
            <p className="mt-1 text-sm text-muted">Ajoutez-en de nouvelles ci-dessous pour continuer.</p>
          </motion.div>
        ) : (
          <EmptyState icon={Users} title="Aucune question" description="Ajoutez vos propres questions « Qui est le plus susceptible de… »" />
        )}
      </AnimatePresence>

      <form onSubmit={add} className="flex gap-2">
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Qui est le plus susceptible de…" aria-label="Nouvelle question" maxLength={200} />
        <Button type="submit" variant="secondary" loading={pending && prompt.length > 0} disabled={!prompt.trim()}>
          <Plus /> Ajouter
        </Button>
      </form>

      {answered.length > 0 && (
        <section>
          <h3 className="text-heading mb-3">Vos réponses</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {answered.map((question) => {
              const agree = question.partnerAnswer !== null && question.partnerAnswer === question.myAnswer;
              return (
                <li key={question.id} className="group flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{question.prompt}</p>
                    <p className="mt-1 text-xs text-muted">
                      Vous : <span className="font-medium text-foreground">{memberName(question.myAnswer)}</span>
                      {question.partnerAnswer !== null ? (
                        <>
                          {" · "}
                          {members.find((m) => m.id !== user.id)?.name ?? "Partenaire"} :{" "}
                          <span className="font-medium text-foreground">{memberName(question.partnerAnswer)}</span>
                        </>
                      ) : (
                        <span className="text-subtle"> · en attente de l&apos;autre réponse</span>
                      )}
                    </p>
                  </div>
                  {question.partnerAnswer !== null && (
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", agree ? "bg-success-soft text-success" : "bg-surface-muted text-muted")}>
                      {agree ? "D'accord" : "Avis partagés"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(question)}
                    className="shrink-0 rounded-md p-1.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                    aria-label="Supprimer la question"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
