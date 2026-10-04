"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction, loginAction, resetPasswordAction } from "@/server/actions/auth";
import { PasswordInput } from "./password-input";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state?.error} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Adresse e-mail" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.values?.email} required autoFocus />
      </Field>
      <Field
        label="Mot de passe"
        htmlFor="password"
        error={state?.fieldErrors?.password}
        action={
          <Link href="/forgot-password" className="text-xs text-muted transition-colors hover:text-foreground">
            Mot de passe oublié ?
          </Link>
        }
      >
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Se connecter
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <FormSuccess message={state.message} />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state?.error} />
      <Field label="Adresse e-mail" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.values?.email} required autoFocus />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Recevoir le lien
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state?.error} />
      <input type="hidden" name="token" value={token} />
      <Field label="Nouveau mot de passe" htmlFor="password" hint="10 caractères minimum." error={state?.fieldErrors?.password}>
        <PasswordInput name="password" autoComplete="new-password" required minLength={10} autoFocus />
      </Field>
      <Field label="Confirmation" htmlFor="confirm" error={state?.fieldErrors?.confirm}>
        <PasswordInput name="confirm" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Enregistrer le mot de passe
      </Button>
    </form>
  );
}
