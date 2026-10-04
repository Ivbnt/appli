import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { buttonVariants } from "@/components/ui/button-variants";
import { AcceptInvitationForm } from "@/components/workspace/onboarding-forms";
import { needsEmailVerification, resolveWorkspaceContext } from "@/server/auth/guards";
import { getCurrentSession } from "@/server/auth/session";
import { previewInvitation } from "@/server/services/workspace";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Invitation" };

const STATUS_MESSAGES = {
  expired: "Cette invitation a expiré. Demandez-en une nouvelle à votre partenaire.",
  used: "Cette invitation a déjà été utilisée ou a été annulée.",
  full: "Cet espace compte déjà deux membres.",
} as const;

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const preview = await previewInvitation(token);
  const session = await getCurrentSession();

  let content: React.ReactNode;

  if (!preview) {
    content = (
      <AuthCard title="Invitation introuvable" description="Ce lien n'est pas valide. Vérifiez qu'il a été copié en entier.">
        <Link href="/" className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}>
          Retour à l&apos;accueil
        </Link>
      </AuthCard>
    );
  } else if (preview.status !== "valid") {
    content = (
      <AuthCard title="Invitation indisponible" description={STATUS_MESSAGES[preview.status]}>
        <Link href="/" className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}>
          Retour à l&apos;accueil
        </Link>
      </AuthCard>
    );
  } else if (!session) {
    content = (
      <AuthCard
        title={`Rejoindre « ${preview.workspaceName} »`}
        description={`${preview.inviterName ?? "Votre partenaire"} vous invite à partager un espace privé.`}
      >
        <div className="flex flex-col gap-2.5">
          <Link href={`/register?invite=${encodeURIComponent(token)}`} className={buttonVariants({ size: "lg" })}>
            Créer mon compte
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            J&apos;ai déjà un compte
          </Link>
        </div>
      </AuthCard>
    );
  } else {
    if (needsEmailVerification(session.user)) redirect("/verify-email");
    const ctx = await resolveWorkspaceContext(session);
    if (ctx?.workspace.id === preview.workspaceId) redirect("/");
    content = (
      <AuthCard
        title={`Rejoindre « ${preview.workspaceName} »`}
        description={
          ctx
            ? "Vous faites déjà partie d'un autre espace. Pour accepter, quittez-le d'abord depuis Paramètres → Couple."
            : `${preview.inviterName ?? "Votre partenaire"} vous invite à partager un espace privé. Tout ce que vous y ajouterez sera visible par vous deux uniquement.`
        }
      >
        {ctx ? (
          <Link href="/settings/couple" className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}>
            Ouvrir les paramètres
          </Link>
        ) : (
          <AcceptInvitationForm token={token} />
        )}
      </AuthCard>
    );
  }

  return <AuthShell>{content}</AuthShell>;
}
