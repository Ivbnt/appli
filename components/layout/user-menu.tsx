"use client";

import { LogOut, Monitor, Moon, Settings, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { startTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { updateThemeAction } from "@/server/actions/account";
import { useShell } from "./shell-context";

const THEMES = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
] as const;

export function UserMenu({ compact, align = "start", side = "top" }: { compact?: boolean; align?: "start" | "end"; side?: "top" | "bottom" | "right" }) {
  const { user, workspace } = useShell();
  const { theme, setTheme } = useTheme();

  return (
    <Dropdown>
      <DropdownTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-xl text-left transition-colors outline-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring data-[state=open]:bg-surface-hover",
          compact ? "p-1" : "w-full px-2 py-2",
        )}
        aria-label="Menu du compte"
      >
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted">{workspace.name}</span>
          </span>
        )}
      </DropdownTrigger>
      <DropdownContent align={align} side={side} className="w-60">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/settings">
            <UserRound /> Compte
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/settings/couple">
            <Settings /> Paramètres de l&apos;espace
          </Link>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownLabel>Apparence</DropdownLabel>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTheme(value);
                void updateThemeAction({ theme: value });
              }}
              aria-pressed={theme === value}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-colors",
                theme === value ? "bg-surface-muted text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <DropdownSeparator />
        <DropdownItem onSelect={() => startTransition(() => logoutAction())}>
          <LogOut /> Se déconnecter
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
