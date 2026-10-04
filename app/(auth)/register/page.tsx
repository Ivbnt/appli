import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/auth-forms";
import { readPendingInvite } from "@/server/auth/pending-invite";
import { getCurrentSession } from "@/server/auth/session";
import { env } from "@/server/env";
import { previewInvitation } from "@/server/services/workspace";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  if (await getCurrentSession()) redirect("/");
  const params = await searchParams;
  const invite = (typeof params.invite === "string" ? params.invite : null) ?? (await readPendingInvite());
  const preview = invite ? await previewInvitation(invite) : null;
  const inviteOnly = env().REGISTRATION_MODE === "invite-only";

  const footer = (
    <>
      Déjà un compte ?{" "}
      <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
        Se connecter
      </Link>
    </>
  );

  if (inviteOnly && preview?.status !== "valid") {
    return (
      <AuthCard
        title="Sur invitation uniquement"
        description="Les inscriptions sont fermées. Demandez à votre partenaire de vous envoyer un lien d'invitation depuis les paramètres de votre espace."
        footer={footer}
      >
        <div />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={preview?.status === "valid" ? `Rejoindre « ${preview.workspaceName} »` : "Créer un compte"}
      description={
        preview?.status === "valid"
          ? `${preview.inviterName ?? "Votre partenaire"} vous invite à rejoindre votre espace commun. Créez votre compte pour commencer.`
          : "Votre espace privé, à deux."
      }
      footer={footer}
    >
      <RegisterForm invite={preview?.status === "valid" ? invite ?? undefined : undefined} />
    </AuthCard>
  );
}
