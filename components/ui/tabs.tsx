"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs as T } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsContent = T.Content;

const listClass = "inline-flex items-center gap-0.5 rounded-[11px] bg-surface-muted p-[3px]";
const triggerClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap text-muted transition-[color,background-color,box-shadow] duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-3.5";
const activeClass = "bg-surface text-foreground shadow-sm dark:bg-surface-hover";

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn(listClass, className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return <T.Trigger className={cn(
        triggerClass,
        "data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-surface-hover",
        className,
      )} {...props} />;
}

/** Onglets reliés à des routes (sous-sections d'une page). */
export function TabLinks({ items, className }: { items: { href: string; label: string; exact?: boolean }[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className={cn("scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div className={listClass}>
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(triggerClass, active && activeClass)}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
