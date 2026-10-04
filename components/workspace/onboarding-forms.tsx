"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { acceptInvitationAction, createWorkspaceAction } from "@/server/actions/workspace";

export function CreateWorkspaceForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(createWorkspaceAction, null);
  const [togetherSince, setTogetherSince] = useState<string | null>(state?.values?.togetherSince || null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state?.error} />
      <Field label="Nom de l'espace" htmlFor="name" hint="Vous pourrez le modifier plus tard." error={state?.fieldErrors?.name}>
        <Input name="name" defaultValue={state?.values?.name ?? defaultName} required maxLength={60} autoFocus />
      </Field>
      <Field label="Ensemble depuis" htmlFor="togetherSince" optional error={state?.fieldErrors?.togetherSince}>
        <DatePicker name="togetherSince" value={togetherSince} onChange={setTogetherSince} placeholder="Votre date à vous" />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Créer notre espace
      </Button>
    </form>
  );
}

export function AcceptInvitationForm({ token, label = "Rejoindre l'espace" }: { token: string; label?: string }) {
  const [state, action, pending] = useActionState(acceptInvitationAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormError message={state?.error} />
      <input type="hidden" name="token" value={token} />
      <Button type="submit" size="lg" loading={pending}>
        {label}
      </Button>
    </form>
  );
}
