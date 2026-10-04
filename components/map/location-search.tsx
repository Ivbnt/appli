"use client";

import { MapPin, Search } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type GeocodeResult = { name: string; address: string; latitude: number; longitude: number };

/** Recherche d'adresse avec suggestions (géocodage côté serveur). */
export function LocationSearch({
  onSelect,
  placeholder = "Rechercher une adresse, un lieu…",
  autoFocus,
}: {
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GeocodeResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setResults([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await response.json()) as { results?: GeocodeResult[]; error?: string };
        if (!response.ok) {
          setError(data.error ?? "Recherche indisponible.");
          setResults([]);
        } else {
          setError(null);
          setResults(data.results ?? []);
          setActive(0);
        }
      } catch {
        if (!controller.signal.aborted) setError("Recherche indisponible. Vous pouvez placer le point directement sur la carte.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const choose = (result: GeocodeResult) => {
    onSelect(result);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + results.length) % results.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(results[active]!);
          }
        }}
        placeholder={placeholder}
        className="pr-9 pl-9"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Rechercher un lieu"
        autoFocus={autoFocus}
      />
      {loading && <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-subtle" />}
      {open && (results.length > 0 || error) && (
        <div className="ui-pop absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg" data-state="open">
          {error ? (
            <p className="px-3 py-2.5 text-sm text-muted">{error}</p>
          ) : (
            <ul id={listId} role="listbox">
              {results.map((result, index) => (
                <li key={`${result.latitude},${result.longitude},${index}`} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(result)}
                    onMouseEnter={() => setActive(index)}
                    className={cn("flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left", index === active && "bg-surface-hover")}
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-subtle" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{result.name}</span>
                      <span className="block truncate text-xs text-muted">{result.address}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
