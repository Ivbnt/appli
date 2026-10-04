import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass = cn(
  "w-full min-w-0 rounded-[10px] border border-border bg-surface px-3 text-[15px] text-foreground shadow-xs sm:text-sm",
  "transition-[border-color,box-shadow] duration-150 outline-none",
  "hover:border-border-strong",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 focus-visible:outline-none",
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/15",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(inputClass, "h-10 sm:h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(inputClass, "min-h-[88px] resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

/** Select natif stylé : idéal sur mobile (sélecteur système) et parfaitement accessible. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(inputClass, "h-10 cursor-pointer appearance-none pr-9 sm:h-9", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-subtle"
      >
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
