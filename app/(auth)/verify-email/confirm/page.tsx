import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ConfirmEmailForm } from "@/components/auth/auth-forms";
import { buttonVariants } from "@/components/ui/button-variants";
import { isAuthTokenValid } from "@/server/services/auth";

export const metadata: Metadata = { title: "Confirmer l'adresse" };

/**
 * La confirmation se fait par un bouton (POST) et non à l'ouverture du lien :
 * les scanners de liens des messageries ne peuvent pas consommer le jeton.
 */
export default async function ConfirmEmailPage({ searchParams }: PageProps<"/verify-email/confirm">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && token.length > 10 && (await isAuthTokenValid(token, "email_verification"));

  if (!valid) {
    return (
      <AuthCard title="Lien expiré" description="Ce lien de confirmation n'est plus valable. Connectez-vous pour en recevoir un nouveau.">
        <Link href="/verify-email" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Recevoir un nouveau lien
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Confirmer votre adresse" description="Une dernière étape avant d'accéder à votre espace.">
      <ConfirmEmailForm token={token} />
    </AuthCard>
  );
}
