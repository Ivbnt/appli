"use client";

import * as React from "react";

export type ShellMember = { id: string; name: string; avatarUrl: string | null };

export type ShellData = {
  user: { id: string; name: string; email: string; avatarUrl: string | null; themePreference: "light" | "dark" | "system" };
  workspace: { name: string };
  members: ShellMember[];
};

type ShellContextValue = ShellData & {
  openSearch: () => void;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

export function ShellProvider({ value, children }: { value: ShellContextValue; children: React.ReactNode }) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const value = React.useContext(ShellContext);
  if (!value) throw new Error("useShell doit être utilisé dans l'application");
  return value;
}

/** Membres de l'espace (pour assigner une tâche, afficher un avatar…). */
export function useMembers() {
  return useShell().members;
}
