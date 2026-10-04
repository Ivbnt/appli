"use client";

import { ThemeProvider } from "next-themes";
import * as React from "react";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/confirm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { configureTimezone } from "@/lib/dates";

export function AppProviders({ timezone, children }: { timezone: string; children: React.ReactNode }) {
  // Même fuseau pour le rendu serveur et le navigateur (aucune différence à l'hydratation).
  configureTimezone(timezone);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <ConfirmProvider>
          {children}
          <ThemedToaster />
        </ConfirmProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

function ThemedToaster() {
  return (
    <Toaster
      position="bottom-right"
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-surface !text-foreground !shadow-lg !font-sans !text-sm !gap-2.5 !px-4 !py-3",
          description: "!text-muted",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md",
          cancelButton: "!bg-surface-muted !text-foreground !rounded-md",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
