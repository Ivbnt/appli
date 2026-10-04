"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resendVerificationAction,
  resetPasswordAction,
  verifyEmailAction,
} from "@/server/actions/auth";
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

export function RegisterForm({ invite }: { invite?: string }) {
  const [state, action, pending] = useActionState(registerAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state?.error} />
      <input type="hidden" name="invite" value={invite ?? ""} />
      <Field label="Prénom" htmlFor="name" error={state?.fieldErrors?.name}>
        <Input name="name" autoComplete="given-name" defaultValue={state?.values?.name} required autoFocus maxLength={60} />
      </Field>
      <Field label="Adresse e-mail" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.values?.email} required />
      </Field>
      <Field label="Mot de passe" htmlFor="password" hint="10 caractères minimum." error={state?.fieldErrors?.password}>
        <PasswordInput name="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Créer mon compte
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
        Envoyer le lien
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

export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verifyEmailAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state?.error} />
      <input type="hidden" name="token" value={token} />
      <Button type="submit" size="lg" loading={pending}>
        Confirmer mon adresse
      </Button>
    </form>
  );
}

export function ResendVerificationForm() {
  const [state, action, pending] = useActionState(resendVerificationAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormError message={state?.error} />
      <FormSuccess message={state?.message} />
      <Button type="submit" variant="secondary" size="lg" loading={pending}>
        Renvoyer le lien
      </Button>
    </form>
  );
}
