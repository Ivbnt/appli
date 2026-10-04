"use client";

import { Check, Copy, Link2, LogOut, Mail, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { createInvitationAction, leaveWorkspaceAction, revokeInvitationAction, updateWorkspaceAction } from "@/server/actions/workspace";
import { SettingsSection } from "./settings-nav";

type Member = { id: string; name: string; email: string; role: "owner" | "member"; avatarUrl: string | null };

export function CoupleSettings({
  workspace,
  members,
  currentUserId,
  pendingInvitation,
}: {
  workspace: { name: string; togetherSince: string | null };
  members: Member[];
  currentUserId: string;
  pendingInvitation: { email: string | null; expiresAt: Date } | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [name, setName] = React.useState(workspace.name);
  const [togetherSince, setTogetherSince] = React.useState(workspace.togetherSince);
  const [saving, startSaving] = React.useTransition();
  const [email, setEmail] = React.useState("");
  const [link, setLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviting, startInviting] = React.useTransition();
  const full = members.length >= 2;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startSaving(async () => {
      const result = await updateWorkspaceAction({ name, togetherSince });
      if (!result.ok) return void toast.error(result.fieldErrors?.name?.[0] ?? result.error);
      toast.success("Espace mis à jour");
      router.refresh();
    });
  };

  const invite = (withEmail: boolean) =>
    startInviting(async () => {
      const result = await createInvitationAction({ email: withEmail ? email : null });
      if (!result.ok) return setInviteError(result.fieldErrors?.email?.[0] ?? result.error);
      setInviteError(null);
      setLink(result.data.url);
      if (withEmail) {
        toast.success(result.data.emailSent ? `Invitation envoyée à ${email}` : "Invitation créée", {
          description: result.data.emailSent ? undefined : "Aucun service d'e-mail n'est configuré : partagez le lien ci-dessous.",
        });
        setEmail("");
      }
      router.refresh();
    });

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const leave = async () => {
    const alone = members.length === 1;
    const ok = await confirm({
      title: "Quitter l'espace ?",
      description: alone
        ? "Vous êtes seul·e dans cet espace : il sera définitivement supprimé, avec toutes ses données et photos."
        : "Vous n'aurez plus accès aux données partagées. Elles restent disponibles pour l'autre membre.",
      confirmLabel: "Quitter l'espace",
      destructive: true,
    });
    if (!ok) return;
    const result = await leaveWorkspaceAction();
    if (result && !result.ok) toast.error(result.error);
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Membres" description="Un espace réunit deux personnes.">
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
              {member.role === "owner" && <Badge tone="outline">Créateur</Badge>}
            </li>
          ))}
        </ul>
      </SettingsSection>

      {!full && (
        <SettingsSection title="Inviter votre partenaire" description="Par e-mail ou avec un lien sécurisé, valable 7 jours et utilisable une seule fois.">
          <div className="flex flex-col gap-4">
            <FormError message={inviteError} />
            {pendingInvitation && !link && (
              <div className="flex items-center gap-3 rounded-xl bg-surface-muted px-3.5 py-3 text-sm">
                <Mail className="size-4 text-muted" />
                <span className="flex-1">
                  Invitation en attente{pendingInvitation.email ? ` pour ${pendingInvitation.email}` : ""} — expire le {formatDate(pendingInvitation.expiresAt, "long")}.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const result = await revokeInvitationAction({});
                    if (result.ok) router.refresh();
                  }}
                >
                  <X /> Annuler
                </Button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                invite(true);
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresse@exemple.fr" aria-label="Adresse e-mail de votre partenaire" />
              <Button type="submit" loading={inviting && Boolean(email)} disabled={!email.trim()}>
                <Mail /> Envoyer l&apos;invitation
              </Button>
            </form>
            <div className="flex items-center gap-3 text-xs text-subtle">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            {link ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={link} readOnly onFocus={(e) => e.target.select()} aria-label="Lien d'invitation" className="font-mono text-xs" />
                <Button variant="secondary" onClick={copy}>
                  {copied ? <Check /> : <Copy />} {copied ? "Copié" : "Copier"}
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => invite(false)} loading={inviting && !email} className="self-start">
                <Link2 /> Créer un lien d&apos;invitation
              </Button>
            )}
          </div>
        </SettingsSection>
      )}

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

      <SettingsSection title="Quitter l'espace" danger>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {members.length === 1 ? "Vous êtes seul·e : quitter supprimera l'espace et toutes ses données." : "L'autre membre conservera l'espace et ses données."}
          </p>
          <Button variant="danger-ghost" onClick={leave} className="shrink-0">
            <LogOut /> Quitter
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
