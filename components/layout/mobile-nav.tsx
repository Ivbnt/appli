"use client";

import { LayoutGrid, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { isActive, MAIN_NAV, SETTINGS_NAV, titleFor } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";
import { UserMenu } from "./user-menu";

/** En-tête compact sur mobile. */
export function MobileHeader() {
  const pathname = usePathname();
  const { openSearch } = useShell();
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <span className="truncate text-[17px] font-semibold tracking-tight">{titleFor(pathname)}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openSearch}
            className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label="Rechercher"
          >
            <Search className="size-5" strokeWidth={1.75} />
          </button>
          <UserMenu compact align="end" side="bottom" />
        </div>
      </div>
    </header>
  );
}

const PRIMARY = MAIN_NAV.filter((item) => item.mobile);
const SECONDARY = [...MAIN_NAV.filter((item) => !item.mobile), SETTINGS_NAV];

/** Barre d'onglets en bas d'écran (zones tactiles ≥ 44 px), avec « Plus » pour le reste. */
export function MobileTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = SECONDARY.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl md:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors",
                  active ? "text-foreground" : "text-subtle",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.6} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors",
              moreActive ? "text-foreground" : "text-subtle",
            )}
            aria-haspopup="dialog"
          >
            <LayoutGrid className="size-[22px]" strokeWidth={moreActive ? 2 : 1.6} aria-hidden="true" />
            Plus
          </button>
        </div>
      </nav>

      <Drawer open={open} onOpenChange={setOpen} title="Toutes les sections">
        <div className="grid grid-cols-3 gap-2 pb-2">
          {SECONDARY.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-[13px] font-medium transition-colors",
                  active ? "border-border-strong bg-surface-muted" : "border-border hover:bg-surface-hover",
                )}
              >
                <Icon className="size-5 text-muted" strokeWidth={1.75} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </Drawer>
    </>
  );
}
