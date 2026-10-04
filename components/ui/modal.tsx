"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const WIDTHS = { sm: "sm:max-w-[400px]", md: "sm:max-w-[520px]", lg: "sm:max-w-[680px]" };

/** Fenêtre modale. Sur mobile, elle devient une feuille ancrée en bas de l'écran. */
export function Modal({ open, onOpenChange, title, description, children, footer, size = "md", className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-overlay fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <Dialog.Content
            className={cn(
              "ui-dialog pointer-events-auto flex max-h-[92dvh] w-full flex-col border border-border bg-surface shadow-lg outline-none",
              "rounded-t-[22px] sm:rounded-2xl",
              WIDTHS[size],
              className,
            )}
          >
            <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-border-strong sm:hidden" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-1 sm:px-6 sm:pt-5">
              <div className="min-w-0">
                <Dialog.Title className="text-heading">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Fenêtre"}</Dialog.Description>
                )}
              </div>
              <Dialog.Close
                className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
            {footer && (
              <div className="pb-safe flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                {footer}
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
