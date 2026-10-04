"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { removeAvatarAction, updateProfileAction } from "@/server/actions/account";

export function ProfileForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [uploading, setUploading] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/account/avatar", { method: "POST", body: form });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setUploading(false);
    if (!response.ok) return void toast.error(data.error ?? "Import impossible.");
    toast.success("Photo de profil mise à jour");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={name} src={avatarUrl} size="xl" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()} loading={uploading}>
            <Camera /> Changer la photo
          </Button>
          {avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const result = await removeAvatarAction();
                if (result.ok) router.refresh();
              }}
            >
              <Trash2 /> Retirer
            </Button>
          )}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <form action={action} className="flex max-w-md flex-col gap-4">
        <FormSuccess message={state?.ok ? state.message : null} />
        <FormError message={state?.error} />
        <Field label="Prénom" htmlFor="profile-name" error={state?.fieldErrors?.name}>
          <Input name="name" defaultValue={name} required maxLength={60} autoComplete="given-name" />
        </Field>
        <Button type="submit" loading={pending} className="self-start">
          Enregistrer
        </Button>
      </form>
    </div>
  );
}
