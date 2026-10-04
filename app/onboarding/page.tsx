import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { AcceptInvitationForm, CreateWorkspaceForm } from "@/components/workspace/onboarding-forms";
import { logoutAction } from "@/server/actions/auth";
import { dismissPendingInviteAction } from "@/server/actions/workspace";
import { requireUser, resolveWorkspaceContext } from "@/server/auth/guards";
import { readPendingInvite } from "@/server/auth/pending-invite";
import { previewInvitation } from "@/server/services/workspace";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function OnboardingPage() {
  const session = await requireUser();
  if (await resolveWorkspaceContext(session)) redirect("/");

  const pendingToken = await readPendingInvite();
  const pending = pendingToken ? await previewInvitation(pendingToken) : null;

  const footer = (
    <form action={logoutAction}>
      <Button type="submit" variant="link" className="text-muted">
        Se déconnecter
      </Button>
    </form>
  );

  return (
    <AuthShell>
      {pendingToken && pending?.status === "valid" ? (
        <AuthCard
          title={`Rejoindre « ${pending.workspaceName} »`}
          description={`${pending.inviterName ?? "Votre partenaire"} vous invite à partager son espace.`}
          footer={
            <form action={dismissPendingInviteAction}>
              <Button type="submit" variant="link" className="text-muted">
                Créer plutôt mon propre espace
              </Button>
            </form>
          }
        >
          <AcceptInvitationForm token={pendingToken} />
        </AuthCard>
      ) : (
        <AuthCard
          title={`Bienvenue, ${session.user.name}`}
          description="Créez votre espace, puis invitez votre partenaire à vous rejoindre."
          footer={footer}
        >
          <CreateWorkspaceForm defaultName={`L'espace de ${session.user.name}`} />
        </AuthCard>
      )}
    </AuthShell>
  );
}
