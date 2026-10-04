"use client";

import { ArrowLeft, Check, ListChecks, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { useMembers, useShell } from "@/components/layout/shell-context";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useSyncedState } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { addQuizQuestionAction, answerQuestionAction, createQuizAction, deleteQuestionAction, deleteQuizAction } from "@/server/actions/fun";
import type { QuestionView, QuizSummary } from "@/server/services/fun";
import { ScoreRing } from "./score-ring";

export function QuizList({ quizzes }: { quizzes: QuizSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createQuizAction({ title, description: description || null });
      if (!result.ok) return setError(result.fieldErrors?.title?.[0] ?? result.error);
      setCreating(false);
      router.push(`/fun/quiz/${result.data.id}`);
    });
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => { setTitle(""); setDescription(""); setError(null); setCreating(true); }}>
          <Plus /> Nouveau quiz
        </Button>
      </div>
      {quizzes.length === 0 ? (
        <EmptyState icon={ListChecks} title="Aucun quiz" description="Créez un quiz avec vos propres questions, répondez chacun de votre côté et comparez." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((quiz) => {
            const complete = quiz.questionCount > 0 && quiz.bothAnswered === quiz.questionCount;
            return (
              <li key={quiz.id}>
                <Link href={`/fun/quiz/${quiz.id}`} className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-5 shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm">
                  {quiz.bothAnswered > 0 ? (
                    <ScoreRing value={quiz.matches / quiz.bothAnswered} size={56} />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded-full bg-surface-muted">
                      <ListChecks className="size-5 text-muted" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{quiz.title}</span>
                    <span className="mt-0.5 block text-sm text-muted tabular">
                      {quiz.questionCount} question{quiz.questionCount > 1 ? "s" : ""} ·{" "}
                      {complete ? "terminé à deux" : quiz.myAnswers === quiz.questionCount && quiz.questionCount > 0 ? "en attente de l'autre" : `${quiz.myAnswers}/${quiz.questionCount} répondues`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Nouveau quiz"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Annuler
            </Button>
            <Button type="submit" form="quiz-form" loading={pending}>
              Créer
            </Button>
          </>
        }
      >
        <form id="quiz-form" onSubmit={create} className="flex flex-col gap-4">
          <Field label="Titre" htmlFor="quiz-title" error={error ?? undefined}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nos goûts" autoFocus maxLength={120} />
          </Field>
          <Field label="Description" htmlFor="quiz-description" optional>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
        </form>
      </Modal>
    </>
  );
}

function QuestionForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = React.useState("");
  const [options, setOptions] = React.useState(["", ""]);
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await addQuizQuestionAction({ quizId, prompt, options: options.map((o) => o.trim()).filter(Boolean) });
      if (!result.ok) return setErrors(result.fieldErrors ?? { _: [result.error] });
      setPrompt("");
      setOptions(["", ""]);
      setErrors({});
      toast.success("Question ajoutée");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">Ajouter une question</h3>
      <FormError message={errors._?.[0] ?? errors.options?.[0]} />
      <Field label="Question" htmlFor="question-prompt" error={errors.prompt}>
        <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Notre destination idéale ?" maxLength={200} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium">Réponses possibles</legend>
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input value={option} onChange={(e) => setOptions((o) => o.map((v, i) => (i === index ? e.target.value : v)))} placeholder={`Réponse ${index + 1}`} aria-label={`Réponse ${index + 1}`} maxLength={80} />
            {options.length > 2 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setOptions((o) => o.filter((_, i) => i !== index))} aria-label="Retirer cette réponse">
                <X />
              </Button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setOptions((o) => [...o, ""])}>
            <Plus /> Réponse
          </Button>
        )}
      </fieldset>
      <Button type="submit" loading={pending} className="self-start" disabled={!prompt.trim()}>
        Ajouter la question
      </Button>
    </form>
  );
}

export function QuizPlay({ quiz }: { quiz: { id: string; title: string; description: string | null; questions: QuestionView[] } }) {
  const router = useRouter();
  const confirm = useConfirm();
  const reduce = useReducedMotion();
  const { user } = useShell();
  const partner = useMembers().find((m) => m.id !== user.id);
  const [questions, setQuestions] = useSyncedState(quiz.questions);
  const [pending, startTransition] = React.useTransition();

  const pendingIndex = questions.findIndex((q) => q.myAnswer === null);
  const current = pendingIndex >= 0 ? questions[pendingIndex] : null;
  const both = questions.filter((q) => q.myAnswer !== null && q.partnerAnswer !== null);
  const matches = both.filter((q) => q.myAnswer === q.partnerAnswer).length;

  const answer = (question: QuestionView, value: string) => {
    setQuestions((list) => list.map((q) => (q.id === question.id ? { ...q, myAnswer: value } : q)));
    startTransition(async () => {
      const result = await answerQuestionAction({ questionId: question.id, value });
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  };

  const verdict = both.length === 0 ? null : matches / both.length >= 0.8 ? "Parfaitement en phase." : matches / both.length >= 0.5 ? "Plutôt en phase." : "Des goûts complémentaires.";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <Link href="/fun/quiz" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Quiz
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-title">{quiz.title}</h2>
            {quiz.description && <p className="mt-1 text-sm text-muted">{quiz.description}</p>}
          </div>
          <Button
            variant="danger-ghost"
            size="icon"
            aria-label="Supprimer le quiz"
            onClick={async () => {
              if (!(await confirm({ title: "Supprimer ce quiz ?", description: "Les questions et vos réponses seront supprimées.", confirmLabel: "Supprimer", destructive: true }))) return;
              const result = await deleteQuizAction({ id: quiz.id });
              if (!result.ok) return void toast.error(result.error);
              router.push("/fun/quiz");
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {current ? (
          <motion.section
            key={current.id}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${(pendingIndex / questions.length) * 100}%` }} />
              </div>
              <span className="text-xs text-muted tabular">
                {pendingIndex + 1}/{questions.length}
              </span>
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-balance">{current.prompt}</h3>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {current.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={pending}
                  onClick={() => answer(current, option)}
                  className="rounded-xl border border-border px-4 py-3.5 text-left text-sm font-medium transition-[border-color,background-color,transform] hover:border-border-strong hover:bg-surface-hover active:scale-[0.99]"
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="mt-5 text-xs text-muted">Votre réponse reste cachée jusqu&apos;à ce que vous ayez tous les deux répondu.</p>
          </motion.section>
        ) : questions.length > 0 ? (
          <motion.section key="result" initial={reduce ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
            {both.length > 0 ? (
              <>
                <ScoreRing value={matches / both.length} size={120} stroke={8} label={`${matches} réponses communes sur ${both.length}`} />
                <p className="text-heading mt-5">{verdict}</p>
                <p className="mt-1 text-sm text-muted">
                  Mêmes réponses à <span className="font-medium text-foreground tabular">{matches}</span> question{matches > 1 ? "s" : ""} sur {both.length}.
                </p>
              </>
            ) : (
              <>
                <p className="text-heading">Bien joué !</p>
                <p className="mt-1 text-sm text-muted">Le résultat s&apos;affichera dès que {partner?.name ?? "votre partenaire"} aura répondu.</p>
              </>
            )}
          </motion.section>
        ) : (
          <EmptyState compact icon={ListChecks} title="Ce quiz est vide" description="Ajoutez une première question ci-dessous." />
        )}
      </AnimatePresence>

      {questions.some((q) => q.myAnswer !== null) && (
        <section>
          <h3 className="text-heading mb-3">Réponses</h3>
          <ul className="flex flex-col gap-2">
            {questions
              .filter((q) => q.myAnswer !== null)
              .map((question) => {
                const revealed = question.partnerAnswer !== null;
                const same = revealed && question.partnerAnswer === question.myAnswer;
                return (
                  <li key={question.id} className="group rounded-2xl border border-border bg-surface px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <p className="flex-1 text-sm font-medium">{question.prompt}</p>
                      {revealed && (
                        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", same ? "bg-success-soft text-success" : "bg-surface-muted text-subtle")}>
                          {same ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await deleteQuestionAction({ questionId: question.id });
                          if (result.ok) setQuestions((list) => list.filter((q) => q.id !== question.id));
                        }}
                        className="rounded-md p-1 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                        aria-label="Supprimer la question"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      Vous : <span className="font-medium text-foreground">{question.myAnswer}</span>
                      {" · "}
                      {partner?.name ?? "Partenaire"} :{" "}
                      {revealed ? <span className="font-medium text-foreground">{question.partnerAnswer}</span> : <span className="text-subtle">{question.partnerAnswered ? "a répondu" : "pas encore répondu"}</span>}
                    </p>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      <QuestionForm quizId={quiz.id} />
    </div>
  );
}
