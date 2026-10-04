"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateWorkspaceAction } from "@/server/actions/workspace";
import { SettingsSection } from "./settings-nav";

type Member = { id: string; name: string; email: string; role: "owner" | "member"; avatarUrl: string | null };

export function CoupleSettings({
  workspace,
  members,
  currentUserId,
}: {
  workspace: { name: string; togetherSince: string | null };
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(workspace.name);
  const [togetherSince, setTogetherSince] = React.useState(workspace.togetherSince);
  const [saving, startSaving] = React.useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startSaving(async () => {
      const result = await updateWorkspaceAction({ name, togetherSince });
      if (!result.ok) return void toast.error(result.fieldErrors?.name?.[0] ?? result.error);
      toast.success("Espace mis à jour");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Membres" description="Les deux comptes de l'espace sont définis dans la configuration de l'application (variable ACCOUNTS).">
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              <Avatar name={member.name} src={member.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.name} {member.id === currentUserId && <span className="font-normal text-muted">(vous)</span>}
                </p>
                <p className="truncate text-xs text-muted">{member.email}</p>
              </div>
                          </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection title="Votre espace">
        <form onSubmit={save} className="flex max-w-md flex-col gap-4">
          <Field label="Nom de l'espace" htmlFor="workspace-name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Ensemble depuis" htmlFor="together-since" optional hint="Votre date importante, rappelée sur l'accueil et la frise des moments.">
            <DatePicker value={togetherSince} onChange={setTogetherSince} />
          </Field>
          <Button type="submit" loading={saving} className="self-start">
            Enregistrer
          </Button>
        </form>
      </SettingsSection>

    </div>
  );
}
