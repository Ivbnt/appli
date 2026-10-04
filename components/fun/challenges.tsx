"use client";

import { Check, Clock, Flag, Gift, Pencil, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { formatDate } from "@/lib/dates";
import { CHALLENGE_DIFFICULTIES, CHALLENGE_STATUSES, type ChallengeDifficulty, type ChallengeStatus } from "@/lib/domain";
import { createChallengeAction, deleteChallengeAction, setChallengeStatusAction, updateChallengeAction } from "@/server/actions/fun";
import type { Challenge } from "@/server/services/fun";

const DIFFICULTY_TONE = { easy: "success", medium: "warning", hard: "accent" } as const;

function ChallengeForm({ open, onOpenChange, challenge, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; challenge: Challenge | null; onSaved: (c: Challenge) => void }) {
  const [draft, setDraft] = React.useState({ title: "", description: "", difficulty: "medium" as ChallengeDifficulty, duration: "", reward: "", status: "todo" as ChallengeStatus });
  const [errors, setErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    setDraft({
      title: challenge?.title ?? "",
      description: challenge?.description ?? "",
      difficulty: challenge?.difficulty ?? "medium",
      duration: challenge?.duration ?? "",
      reward: challenge?.reward ?? "",
      status: challenge?.status ?? "todo",
    });
    setErrors({});
  }, [open, challenge]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = { ...draft, description: draft.description || null, duration: draft.duration || null, reward: draft.reward || null };
      const result = challenge ? await updateChallengeAction({ id: challenge.id, ...payload }) : await createChallengeAction(payload);
      if (!result.ok) return setErrors(result.fieldErrors ?? { _: [result.error] });
      onSaved(result.data);
      onOpenChange(false);
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={challenge ? "Modifier le défi" : "Nouveau défi"}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="challenge-form" loading={pending}>
            {challenge ? "Enregistrer" : "Créer"}
          </Button>
        </>
      }
    >
      <form id="challenge-form" onSubmit={submit} className="flex flex-col gap-4">
        <FormError message={errors._?.[0]} />
        <Field label="Défi" htmlFor="challenge-title" error={errors.title}>
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Un pique-nique par mois" autoFocus maxLength={160} />
        </Field>
        <Field label="Description" htmlFor="challenge-description" optional>
          <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Difficulté</span>
          <Segmented
            label="Difficulté"
            value={draft.difficulty}
            onChange={(v) => setDraft({ ...draft, difficulty: v })}
            options={(Object.keys(CHALLENGE_DIFFICULTIES) as ChallengeDifficulty[]).map((d) => ({ value: d, label: CHALLENGE_DIFFICULTIES[d] }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Durée" htmlFor="challenge-duration" optional>
            <Input value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} placeholder="1 mois" maxLength={60} />
          </Field>
          <Field label="Récompense" htmlFor="challenge-reward" optional>
            <Input value={draft.reward} onChange={(e) => setDraft({ ...draft, reward: e.target.value })} placeholder="Un dîner au restaurant" maxLength={160} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export function Challenges({ initialChallenges }: { initialChallenges: Challenge[] }) {
  const confirm = useConfirm();
  const reduce = useReducedMotion();
  const [challenges, setChallenges] = React.useState(initialChallenges);
  const [form, setForm] = React.useState<{ open: boolean; challenge: Challenge | null }>({ open: false, challenge: null });

  const upsert = (challenge: Challenge) =>
    setChallenges((list) => (list.some((c) => c.id === challenge.id) ? list.map((c) => (c.id === challenge.id ? challenge : c)) : [challenge, ...list]));

  const setStatus = async (challenge: Challenge, status: ChallengeStatus) => {
    const result = await setChallengeStatusAction({ id: challenge.id, status });
    if (!result.ok) return void toast.error(result.error);
    upsert(result.data);
    if (status === "done") toast.success("Défi relevé, bravo !", { description: challenge.reward ? `Récompense : ${challenge.reward}` : undefined });
  };

  const remove = async (challenge: Challenge) => {
    if (!(await confirm({ title: "Supprimer ce défi ?", description: challenge.title, confirmLabel: "Supprimer", destructive: true }))) return;
    const result = await deleteChallengeAction({ id: challenge.id });
    if (!result.ok) return void toast.error(result.error);
    setChallenges((list) => list.filter((c) => c.id !== challenge.id));
  };

  const groups: ChallengeStatus[] = ["in_progress", "todo", "done"];

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setForm({ open: true, challenge: null })}>
          <Plus /> Nouveau défi
        </Button>
      </div>
      {challenges.length === 0 ? (
        <EmptyState icon={Flag} title="Aucun défi" description="Lancez-vous de petits défis à deux : une recette par semaine, une balade par mois…" />
      ) : (
        <div className="flex flex-col gap-9">
          {groups.map((status) => {
            const items = challenges.filter((c) => c.status === status);
            if (items.length === 0) return null;
            return (
              <section key={status}>
                <h2 className="text-heading mb-3">
                  {CHALLENGE_STATUSES[status]} <span className="font-normal text-subtle tabular">{items.length}</span>
                </h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {items.map((challenge, index) => (
                    <motion.li
                      key={challenge.id}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">{challenge.title}</p>
                        <Badge tone={DIFFICULTY_TONE[challenge.difficulty]}>{CHALLENGE_DIFFICULTIES[challenge.difficulty]}</Badge>
                      </div>
                      {challenge.description && <p className="mt-1.5 text-sm text-muted">{challenge.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        {challenge.duration && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3.5" /> {challenge.duration}
                          </span>
                        )}
                        {challenge.reward && (
                          <span className="flex items-center gap-1.5">
                            <Gift className="size-3.5" /> {challenge.reward}
                          </span>
                        )}
                        {challenge.completedAt && <span>Relevé le {formatDate(challenge.completedAt, "long")}</span>}
                      </div>
                      <div className="mt-4 flex items-center gap-1.5">
                        {status === "todo" && (
                          <Button size="sm" onClick={() => setStatus(challenge, "in_progress")}>
                            <Play /> Commencer
                          </Button>
                        )}
                        {status === "in_progress" && (
                          <Button size="sm" onClick={() => setStatus(challenge, "done")}>
                            <Check /> Défi relevé
                          </Button>
                        )}
                        {status === "done" && (
                          <Button size="sm" variant="ghost" onClick={() => setStatus(challenge, "todo")}>
                            <RotateCcw /> Recommencer
                          </Button>
                        )}
                        <span className="ml-auto flex opacity-60 transition-opacity group-hover:opacity-100">
                          <Button size="icon-sm" variant="ghost" onClick={() => setForm({ open: true, challenge })} aria-label="Modifier">
                            <Pencil />
                          </Button>
                          <Button size="icon-sm" variant="danger-ghost" onClick={() => remove(challenge)} aria-label="Supprimer">
                            <Trash2 />
                          </Button>
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <ChallengeForm open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} challenge={form.challenge} onSaved={upsert} />
    </>
  );
}
