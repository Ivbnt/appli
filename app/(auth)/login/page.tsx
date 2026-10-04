import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/auth-forms";
import { safeRedirectPath } from "@/server/auth/request";
import { getCurrentSession } from "@/server/auth/session";
import { isConfiguredEmail } from "@/server/services/accounts";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeRedirectPath(typeof next === "string" ? next : undefined, "/");
  const session = await getCurrentSession();
  if (session && isConfiguredEmail(session.user.email)) redirect(nextPath);

  return (
    <AuthCard
      title="Bon retour"
      description="Connectez-vous à votre espace."
      footer={
        <>
          Première connexion ?{" "}
          <Link href="/forgot-password?first=1" className="font-medium text-foreground underline-offset-4 hover:underline">
            Choisir mon mot de passe
          </Link>
        </>
      }
    >
      <LoginForm next={nextPath} />
    </AuthCard>
  );
}
