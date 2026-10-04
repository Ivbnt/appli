"use client";

import { Popover as P } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({ className, align = "start", sideOffset = 6, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={sideOffset}
        className={cn("ui-pop z-[55] rounded-xl border border-border bg-surface p-3 shadow-lg outline-none", className)}
        {...props}
      />
    </P.Portal>
  );
}
