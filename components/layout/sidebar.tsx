"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { AvatarStack } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { isActive, MAIN_NAV, SETTINGS_NAV, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";
import { UserMenu } from "./user-menu";

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-[10px] text-[13.5px] font-medium transition-colors duration-150",
        collapsed ? "w-10 justify-center" : "px-2.5",
        active
          ? "bg-surface text-foreground shadow-xs ring-1 ring-border dark:bg-surface-hover dark:ring-0"
          : "text-muted hover:bg-surface-hover/70 hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-[18px] shrink-0 transition-colors", active ? "text-foreground" : "text-subtle group-hover:text-foreground")}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
    </Link>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/** Navigation latérale : complète sur grand écran, réduite en icônes sur tablette. */
export function Sidebar() {
  const { workspace, members, openSearch } = useShell();

  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col py-4 md:flex md:w-[72px] md:items-center lg:w-[248px] lg:items-stretch lg:px-3">
      <div className="mb-5 flex items-center gap-2.5 lg:px-2">
        <LogoMark className="size-8 lg:size-7" />
        <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold tracking-tight lg:block">{workspace.name}</span>
        <span className="hidden lg:block">
          <AvatarStack people={members.map((m) => ({ name: m.name, src: m.avatarUrl }))} size="xs" />
        </span>
      </div>

      <button
        type="button"
        onClick={openSearch}
        className="mb-4 flex h-9 items-center gap-2.5 rounded-[10px] border border-border bg-surface text-[13px] text-subtle shadow-xs transition-colors hover:border-border-strong hover:text-muted md:w-10 md:justify-center lg:w-auto lg:justify-start lg:px-2.5"
        aria-label="Rechercher (Ctrl+K)"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden flex-1 text-left lg:block">Rechercher…</span>
        <Kbd className="hidden lg:inline-flex">⌘K</Kbd>
      </button>

      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-0.5">
        <span className="contents lg:hidden">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed />
          ))}
        </span>
        <span className="hidden lg:contents">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={false} />
          ))}
        </span>
      </nav>

      <div className="mt-4 flex flex-col gap-1 md:items-center lg:items-stretch">
        <span className="contents lg:hidden">
          <NavLink item={SETTINGS_NAV} collapsed />
        </span>
        <span className="hidden lg:contents">
          <NavLink item={SETTINGS_NAV} collapsed={false} />
        </span>
        <div className="mt-2 border-t border-border pt-3 lg:mx-0">
          <span className="lg:hidden">
            <UserMenu compact side="right" />
          </span>
          <span className="hidden lg:block">
            <UserMenu />
          </span>
        </div>
      </div>
    </aside>
  );
}
