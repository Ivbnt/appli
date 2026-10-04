"use client";

import { Bell, Heart, Palette, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings", label: "Compte", icon: UserRound },
  { href: "/settings/couple", label: "Couple", icon: Heart },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/appearance", label: "Apparence", icon: Palette },
  { href: "/settings/privacy", label: "Confidentialité", icon: ShieldCheck },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Paramètres" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium transition-colors",
              active ? "bg-surface-muted text-foreground" : "text-muted hover:bg-surface-hover/70 hover:text-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SettingsSection({ title, description, children, danger }: { title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={cn("rounded-2xl border bg-surface", danger ? "border-danger/25" : "border-border")}>
      <header className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className={cn("text-heading", danger && "text-danger")}>{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
