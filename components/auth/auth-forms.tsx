"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/server/actions/auth";
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
      <Field label="Mot de passe" htmlFor="password" error={state?.fieldErrors?.password}>
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Se connecter
      </Button>
    </form>
  );
}
