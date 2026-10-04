"use client";

import { Check } from "lucide-react";
import { DropdownMenu as Menu } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dropdown = Menu.Root;
export const DropdownTrigger = Menu.Trigger;

export function DropdownContent({ className, align = "end", sideOffset = 6, ...props }: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "ui-pop z-50 min-w-[200px] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

const itemClass =
  "relative flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover [&_svg]:size-4 [&_svg]:text-muted";

export function DropdownItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof Menu.Item> & { destructive?: boolean }) {
  return (
    <Menu.Item
      className={cn(itemClass, destructive && "text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger", className)}
      {...props}
    />
  );
}

export function DropdownCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem className={cn(itemClass, "pr-8", className)} {...props}>
      {children}
      <Menu.ItemIndicator className="absolute right-2.5">
        <Check className="size-4" />
      </Menu.ItemIndicator>
    </Menu.CheckboxItem>
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn("px-2.5 pt-2 pb-1 text-xs font-medium text-subtle", className)} {...props} />;
}

export function DropdownSeparator({ className, ...props }: React.ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
