"use client";

import { CalendarDays, X } from "lucide-react";
import * as React from "react";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Calendar } from "./calendar";
import { inputClass } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const toDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
const toValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

type DatePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/** Sélecteur de date calendaire (valeur « AAAA-MM-JJ »). */
export function DatePicker({
  value,
  onChange,
  id,
  name,
  placeholder = "Choisir une date",
  clearable = true,
  className,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? toDate(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            {...aria}
            className={cn(inputClass, "flex h-10 items-center gap-2 pr-9 text-left sm:h-9", !value && "text-subtle", className)}
          >
            <CalendarDays className="size-4 shrink-0 text-subtle" aria-hidden="true" />
            <span className="truncate">{value ? formatDay(value, "long") : placeholder}</span>
          </button>
        </PopoverTrigger>
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:bg-surface-hover hover:text-foreground"
            aria-label="Effacer la date"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <PopoverContent className="w-auto p-3">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? toValue(date) : null);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
