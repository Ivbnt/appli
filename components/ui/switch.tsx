"use client";

import { Switch as S } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "peer inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border border-transparent bg-border-strong transition-colors duration-200",
        "data-[state=checked]:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <S.Thumb className="pointer-events-none block size-[18px] translate-x-[1px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out-soft)] data-[state=checked]:translate-x-[17px]" />
    </S.Root>
  );
}
