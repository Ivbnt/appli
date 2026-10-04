import type { Metadata } from "next";
import { PrivacySettings } from "@/components/settings/preferences";
import { requireWorkspace } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Confidentialité" };

export default async function PrivacySettingsPage() {
  await requireWorkspace();
  return <PrivacySettings />;
}
