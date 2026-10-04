import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ResendVerificationForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth";
import { needsEmailVerification } from "@/server/auth/guards";
import { requireUser } from "@/server/auth/guards";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Vérifiez votre adresse" };

export default async function VerifyEmailPage() {
  const session = await requireUser({ allowUnverified: true });
  if (!needsEmailVerification(session.user)) redirect("/");
  const consoleMode = env().EMAIL_PROVIDER === "console";

  return (
    <AuthCard
      title="Vérifiez votre adresse"
      description={
        <>
          Un lien de confirmation a été envoyé à <span className="font-medium text-foreground">{session.user.email}</span>.
          Ouvrez-le pour accéder à votre espace.
        </>
      }
      footer={
        <form action={logoutAction}>
          <Button type="submit" variant="link" className="text-muted">
            Se déconnecter
          </Button>
        </form>
      }
    >
      {consoleMode && (
        <p className="mb-4 rounded-[10px] border border-warning/25 bg-warning-soft px-3 py-2.5 text-[13px] text-foreground">
          Mode développement : aucun e-mail n&apos;est envoyé (EMAIL_PROVIDER=console). Le lien est affiché dans les logs du
          serveur (<code className="font-mono text-xs">docker compose logs app</code>).
        </p>
      )}
      <ResendVerificationForm />
    </AuthCard>
  );
}
