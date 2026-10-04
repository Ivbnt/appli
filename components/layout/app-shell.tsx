"use client";

import * as React from "react";
import { CommandPalette } from "./command-palette";
import { MobileHeader, MobileTabBar } from "./mobile-nav";
import { ShellProvider, type ShellData } from "./shell-context";
import { Sidebar } from "./sidebar";
import { ThemeSync } from "./theme-sync";

/**
 * Structure de l'application : barre latérale (desktop), en-tête + onglets (mobile),
 * et contenu principal présenté dans un panneau sobre sur grand écran.
 */
export function AppShell({ data, children }: { data: ShellData; children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const openSearch = React.useCallback(() => setSearchOpen(true), []);

  return (
    <ShellProvider value={{ ...data, openSearch }}>
      <ThemeSync preference={data.user.themePreference} />
      <a
        href="#main"
        className="sr-only z-[90] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
          <MobileHeader />
          <main
            id="main"
            className="flex-1 pb-[calc(env(safe-area-inset-bottom)+5rem)] md:rounded-2xl md:border md:border-border md:bg-surface md:pb-0 md:shadow-xs"
          >
            {children}
          </main>
        </div>
      </div>
      <MobileTabBar />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </ShellProvider>
  );
}
