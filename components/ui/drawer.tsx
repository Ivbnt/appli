"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

/** Panneau latéral (desktop) ou feuille du bas (mobile), pour les détails et l'édition. */
export function Drawer({ open, onOpenChange, title, description, children, footer, className }: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-overlay fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          className={cn(
            "ui-drawer fixed z-50 flex flex-col border-border bg-surface shadow-lg outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[22px] border-t",
            "md:inset-y-2 md:right-2 md:left-auto md:max-h-none md:w-[440px] md:rounded-2xl md:border",
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-border-strong md:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 md:px-6 md:pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-heading">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Panneau"}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-6">{children}</div>
          {footer && (
            <div className="pb-safe flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end md:px-6">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
