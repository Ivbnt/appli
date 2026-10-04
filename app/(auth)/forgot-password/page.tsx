import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Choisir un mot de passe" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { first } = await searchParams;
  const firstTime = first === "1";
  return (
    <AuthCard
      title={firstTime ? "Première connexion" : "Mot de passe oublié"}
      description={
        firstTime
          ? "Indiquez votre adresse : vous recevrez un lien pour choisir votre mot de passe."
          : "Indiquez votre adresse : nous vous enverrons un lien pour en choisir un nouveau."
      }
      footer={
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
