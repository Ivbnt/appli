import * as React from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string | string[];
  optional?: boolean;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean; id?: string }>;
};

/** Libellé + champ + aide + erreur, reliés par les attributs ARIA appropriés. */
export function Field({ label, htmlFor, hint, error, optional, className, action, children }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = message ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
          {label}
          {optional && <span className="ml-1.5 font-normal text-subtle">facultatif</span>}
        </label>
        {action}
      </div>
      {React.cloneElement(children, {
        id: htmlFor,
        "aria-describedby": describedBy,
        "aria-invalid": message ? true : undefined,
      })}
      {hint && !message && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {message && (
        <p id={errorId} className="text-xs font-medium text-danger" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-[10px] border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded-[10px] border border-success/20 bg-success-soft px-3 py-2.5 text-sm text-success">
      {message}
    </div>
  );
}
