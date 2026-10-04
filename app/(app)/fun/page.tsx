import { CircleDot, Dices, Flag, ListChecks, Medal, MessagesSquare, Shuffle, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireWorkspace } from "@/server/auth/guards";
import { db, sql } from "@/server/db";

export const metadata: Metadata = { title: "Fun" };

export default async function FunPage() {
  const ctx = await requireWorkspace();
  const stats = await db.one<{ who: number; quizzes: number; challenges: number; badges: number; totalBadges: number }>(sql`
    SELECT
      (SELECT count(*) FROM quiz_questions q JOIN quizzes z ON z.id = q.quiz_id
        WHERE z.workspace_id = ${ctx.workspace.id} AND z.kind = 'who_of_us'
          AND NOT EXISTS (SELECT 1 FROM quiz_answers a WHERE a.question_id = q.id AND a.user_id = ${ctx.user.id}))::int AS who,
      (SELECT count(*) FROM quizzes WHERE workspace_id = ${ctx.workspace.id} AND kind = 'couple_quiz')::int AS quizzes,
      (SELECT count(*) FROM challenges WHERE workspace_id = ${ctx.workspace.id} AND status = 'in_progress')::int AS challenges,
      (SELECT count(*) FROM user_badges WHERE workspace_id = ${ctx.workspace.id})::int AS badges,
      (SELECT count(*) FROM badges)::int AS total_badges`);

  const cards = [
    { href: "/fun/questions", icon: MessagesSquare, title: "Questions de couple", text: "520 questions en 10 niveaux, du « on rigole » au « pourquoi tu m'as demandé ça ? »." },
    { href: "/fun/party", icon: Dices, title: "Défis de soirée", text: "270 défis, du chaos créatif à l'After Dark, avec missions secrètes." },
    { href: "/fun/tonight", icon: Shuffle, title: "Ce soir, on fait…", text: "Un tirage au sort quand vous n'arrivez pas à choisir." },
    { href: "/fun/wheel", icon: CircleDot, title: "Roue des activités", text: "Faites tourner la roue, laissez le hasard décider." },
    { href: "/fun/who", icon: Users, title: "Qui de nous deux ?", text: stats.who ? `${stats.who} question${stats.who > 1 ? "s" : ""} vous attend${stats.who > 1 ? "ent" : ""}.` : "Qui est le plus susceptible de… ?" },
    { href: "/fun/quiz", icon: ListChecks, title: "Quiz de couple", text: stats.quizzes ? `${stats.quizzes} quiz · êtes-vous en phase ?` : "Répondez chacun de votre côté, comparez." },
    { href: "/fun/challenges", icon: Flag, title: "Nos défis", text: stats.challenges ? `${stats.challenges} défi${stats.challenges > 1 ? "s" : ""} en cours.` : "De petits défis à relever ensemble." },
    { href: "/fun/badges", icon: Medal, title: "Badges", text: `${stats.badges} sur ${stats.totalBadges} obtenus.` },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ href, icon: Icon, title, text }) => (
        <li key={href}>
          <Link href={href} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
            <span className="mb-8 flex size-10 items-center justify-center rounded-xl bg-surface-muted text-muted transition-colors group-hover:text-foreground">
              <Icon className="size-[18px]" strokeWidth={1.75} />
            </span>
            <span className="font-semibold">{title}</span>
            <span className="mt-1 text-sm text-muted">{text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
