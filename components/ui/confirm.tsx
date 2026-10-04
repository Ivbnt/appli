"use client";

import { AlertDialog } from "radix-ui";
import * as React from "react";
import { Button } from "./button";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = React.createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Fournit `useConfirm()` : une confirmation élégante qui remplace `window.confirm`. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);

  const confirm = React.useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={pending !== null} onOpenChange={(open) => !open && close(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="ui-overlay fixed inset-0 z-[60] bg-overlay" />
          <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
            <AlertDialog.Content className="ui-dialog pointer-events-auto w-full rounded-t-[22px] border border-border bg-surface p-6 shadow-lg outline-none sm:max-w-[400px] sm:rounded-2xl">
              <AlertDialog.Title className="text-heading">{pending?.title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted">
                {pending?.description ?? "Cette action est définitive."}
              </AlertDialog.Description>
              <div className="pb-safe mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialog.Cancel asChild>
                  <Button variant="secondary">{pending?.cancelLabel ?? "Annuler"}</Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button variant={pending?.destructive ? "danger" : "primary"} onClick={() => close(true)}>
                    {pending?.confirmLabel ?? "Confirmer"}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </div>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm doit être utilisé dans <ConfirmProvider>");
  return confirm;
}
