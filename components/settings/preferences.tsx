"use client";

import { Download, Mail, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { REMINDER_OPTIONS } from "@/lib/domain";
import { useMounted } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { sendTestEmailAction, updateNotificationsAction, updateThemeAction } from "@/server/actions/account";
import { deleteWorkspaceContentAction } from "@/server/actions/workspace";
import { SettingsSection } from "./settings-nav";

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted">{description}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function NotificationSettings({
  initial,
  emailConfigured,
}: {
  initial: { emailNotifications: boolean; reminderEmails: boolean; defaultReminderMinutes: number | null };
  emailConfigured: boolean;
}) {
  const [prefs, setPrefs] = React.useState(initial);

  const update = async (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const result = await updateNotificationsAction(next);
    if (!result.ok) {
      toast.error(result.error);
      setPrefs(prefs);
    } else toast.success("Préférences enregistrées");
  };

  return (
    <div className="flex flex-col gap-6">
      {!emailConfigured && (
        <p className="rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm">
          Aucun service d&apos;e-mail n&apos;est configuré (<code className="font-mono text-xs">EMAIL_PROVIDER=console</code>) : les e-mails sont seulement écrits dans les
          journaux du serveur. Configurez <code className="font-mono text-xs">EMAIL_PROVIDER</code> pour les recevoir réellement.
        </p>
      )}
      <SettingsSection title="E-mails">
        <div className="divide-y divide-border">
          <ToggleRow
            title="Nouvelles de votre partenaire"
            description="Quand votre partenaire vous confie une tâche, ajoute un événement au calendrier ou crée un voyage."
            checked={prefs.emailNotifications}
            onChange={(v) => update({ emailNotifications: v })}
          />
          <ToggleRow
            title="Rappels"
            description="Restaurant demain, anniversaire dans 7 jours, départ en voyage…"
            checked={prefs.reminderEmails}
            onChange={(v) => update({ reminderEmails: v })}
          />
        </div>
      </SettingsSection>
      <SettingsSection title="Tester l'envoi" description="Envoie un e-mail à votre adresse pour vérifier la configuration.">
        <TestEmailButton />
      </SettingsSection>
      <SettingsSection title="Rappel par défaut" description="Proposé à la création d'un événement, et utilisé pour les réservations.">
        <div className="max-w-xs">
          <Select
            value={String(prefs.defaultReminderMinutes ?? "none")}
            onValueChange={(v) => update({ defaultReminderMinutes: v === "none" ? null : Number(v) })}
            options={REMINDER_OPTIONS.map((o) => ({ value: String(o.value ?? "none"), label: o.label }))}
          />
        </div>
      </SettingsSection>
    </div>
  );
}

function TestEmailButton() {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="secondary"
      loading={pending}
      className="self-start"
      onClick={() =>
        startTransition(async () => {
          const result = await sendTestEmailAction();
          if (!result.ok) return void toast.error(result.error);
          if (result.data.delivered) toast.success(`E-mail envoyé à ${result.data.to}`, { description: "Pensez à regarder dans les indésirables." });
          else toast.info("E-mail écrit dans les journaux du serveur", { description: "EMAIL_PROVIDER=console : rien n'est réellement envoyé." });
        })
      }
    >
      <Mail /> Envoyer un e-mail de test
    </Button>
  );
}

const THEMES = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
] as const;

function ThemePreview({ dark }: { dark: boolean }) {
  return (
    <div className={cn("flex h-24 gap-1.5 overflow-hidden rounded-lg p-2", dark ? "bg-[#18181b]" : "bg-[#f5f5f3]")}>
      <div className={cn("w-1/4 rounded-md", dark ? "bg-[#232326]" : "bg-[#ebebe8]")} />
      <div className={cn("flex flex-1 flex-col gap-1.5 rounded-md p-2", dark ? "bg-[#202023]" : "bg-white")}>
        <div className={cn("h-2 w-1/2 rounded-full", dark ? "bg-[#e4e4e7]" : "bg-[#27272a]")} />
        <div className={cn("h-1.5 w-3/4 rounded-full", dark ? "bg-[#3f3f46]" : "bg-[#d4d4d8]")} />
        <div className={cn("mt-auto h-4 w-1/3 rounded", dark ? "bg-[#e4e4e7]" : "bg-[#27272a]")} />
      </div>
    </div>
  );
}

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <SettingsSection title="Thème" description="Le mode sombre a été conçu spécifiquement : contrastes, surfaces et couleurs ajustés.">
      <div role="radiogroup" aria-label="Thème" className="grid gap-3 sm:grid-cols-3">
        {THEMES.map(({ value, label, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setTheme(value);
                void updateThemeAction({ theme: value });
              }}
              className={cn(
                "rounded-xl border p-2 text-left transition-[border-color,box-shadow]",
                active ? "border-primary ring-2 ring-primary/10" : "border-border hover:border-border-strong",
              )}
            >
              {value === "system" ? (
                <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
                  <ThemePreview dark={false} />
                  <ThemePreview dark />
                </div>
              ) : (
                <ThemePreview dark={value === "dark"} />
              )}
              <span className="mt-2.5 flex items-center gap-2 px-1 pb-1 text-sm font-medium">
                <Icon className="size-4 text-muted" /> {label}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}

export function PrivacySettings() {
  const [confirmation, setConfirmation] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Exporter vos données" description="Une archive ZIP avec toutes vos données (format JSON), vos photos originales et vos documents.">
        <a href="/api/export" className={buttonVariants({ variant: "secondary" })} download>
          <Download /> Télécharger l&apos;export
        </a>
      </SettingsSection>

      <SettingsSection title="Effacer le contenu de l'espace" description="Supprime définitivement lieux, tâches, calendrier, photos, films, voyages et jeux. Les comptes et l'espace sont conservés." danger>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await deleteWorkspaceContentAction({ confirmation: confirmation as "EFFACER" });
              if (!result.ok) return void toast.error(result.fieldErrors?.confirmation?.[0] ?? result.error);
              setConfirmation("");
              toast.success("Le contenu de l'espace a été effacé");
            });
          }}
          className="flex max-w-md flex-col gap-3"
        >
          <Field label="Tapez EFFACER pour confirmer" htmlFor="erase-confirmation">
            <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" />
          </Field>
          <Button type="submit" variant="danger" loading={pending} disabled={confirmation !== "EFFACER"} className="self-start">
            Effacer tout le contenu
          </Button>
        </form>
      </SettingsSection>

    </div>
  );
}
