import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { buttonVariants } from "@/components/ui/button";
import { isAuthTokenValid } from "@/server/services/auth";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && token.length > 10 && (await isAuthTokenValid(token, "password_reset"));

  if (!valid) {
    return (
      <AuthCard title="Lien expiré" description="Ce lien de réinitialisation n'est plus valable. Les liens expirent après une heure et ne servent qu'une fois.">
        <Link href="/forgot-password" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Demander un nouveau lien
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nouveau mot de passe" description="Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
