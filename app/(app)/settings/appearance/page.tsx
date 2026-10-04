import type { Metadata } from "next";
import { AppearanceSettings } from "@/components/settings/preferences";

export const metadata: Metadata = { title: "Apparence" };

export default function AppearanceSettingsPage() {
  return <AppearanceSettings />;
}
