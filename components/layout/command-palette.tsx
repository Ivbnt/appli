"use client";

import { Command } from "cmdk";
import {
  CalendarDays,
  CheckSquare,
  Clapperboard,
  Image as ImageIcon,
  MapPin,
  Plane,
  Plus,
  Search,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { MAIN_NAV, SETTINGS_NAV } from "@/lib/navigation";
import type { SearchResult, SearchResultKind } from "@/lib/search";

const KIND_META: Record<SearchResultKind, { label: string; icon: LucideIcon }> = {
  place: { label: "Lieux", icon: MapPin },
  task: { label: "Tâches", icon: CheckSquare },
  event: { label: "Événements", icon: CalendarDays },
  movie: { label: "Films", icon: Clapperboard },
  photo: { label: "Photos", icon: ImageIcon },
  trip: { label: "Voyages", icon: Plane },
  reservation: { label: "Réservations", icon: Ticket },
};

const QUICK_ACTIONS = [
  { label: "Nouvelle tâche", href: "/tasks?new=1" },
  { label: "Nouvel événement", href: "/calendar?new=1" },
  { label: "Ajouter un lieu", href: "/map?new=1" },
  { label: "Ajouter des photos", href: "/memories?upload=1" },
  { label: "Ajouter un film", href: "/movies?new=1" },
  { label: "Nouveau voyage", href: "/trips?new=1" },
];

const itemClass =
  "flex h-11 cursor-default items-center gap-3 rounded-lg px-3 text-sm outline-none select-none data-[selected=true]:bg-surface-hover [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-subtle";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (response.ok) setResults(((await response.json()) as { results: SearchResult[] }).results);
      } catch {
        // requête annulée par une frappe plus récente
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const grouped = React.useMemo(() => {
    const groups = new Map<SearchResultKind, SearchResult[]>();
    for (const result of results) groups.set(result.kind, [...(groups.get(result.kind) ?? []), result]);
    return [...groups.entries()];
  }, [results]);

  const searching = query.trim().length >= 2;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-overlay fixed inset-0 z-[80] bg-overlay backdrop-blur-[2px]" />
        <Dialog.Content className="ui-dialog fixed inset-x-0 top-0 z-[80] mx-auto w-full outline-none sm:top-[12vh] sm:max-w-[620px] sm:px-4">
          <Dialog.Title className="sr-only">Recherche globale</Dialog.Title>
          <Dialog.Description className="sr-only">
            Recherchez parmi vos lieux, tâches, événements, films, photos, voyages et réservations.
          </Dialog.Description>
          <Command
            shouldFilter={!searching}
            loop
            className="pt-safe overflow-hidden border-border bg-surface shadow-lg sm:rounded-2xl sm:border"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              {loading ? <Spinner className="size-4 text-subtle" /> : <Search className="size-4 text-subtle" aria-hidden="true" />}
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Rechercher un lieu, un film, une tâche…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
              />
              <button type="button" onClick={() => onOpenChange(false)} className="sm:hidden text-sm text-muted">
                Annuler
              </button>
              <Kbd className="hidden sm:inline-flex">Échap</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain p-2">
              {searching && !loading && (
                <Command.Empty className="px-3 py-10 text-center text-sm text-muted">
                  Aucun résultat pour « {query.trim()} ».
                </Command.Empty>
              )}

              {searching ? (
                grouped.map(([kind, items]) => {
                  const meta = KIND_META[kind];
                  const Icon = meta.icon;
                  return (
                    <Command.Group
                      key={kind}
                      heading={meta.label}
                      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle"
                    >
                      {items.map((item) => (
                        <Command.Item key={`${kind}-${item.id}`} value={`${kind}-${item.id}`} onSelect={() => go(item.href)} className={itemClass}>
                          <Icon aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                          {item.subtitle && <span className="shrink-0 truncate text-xs text-subtle">{item.subtitle}</span>}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })
              ) : (
                <>
                  <Command.Group
                    heading="Actions rapides"
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle"
                  >
                    {QUICK_ACTIONS.map((action) => (
                      <Command.Item key={action.href} value={action.label} onSelect={() => go(action.href)} className={itemClass}>
                        <Plus aria-hidden="true" />
                        {action.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group
                    heading="Aller à"
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle"
                  >
                    {[...MAIN_NAV, SETTINGS_NAV].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item key={item.href} value={`Aller à ${item.label}`} onSelect={() => go(item.href)} className={itemClass}>
                          <Icon aria-hidden="true" />
                          {item.label}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                </>
              )}
            </Command.List>
            <div className="hidden items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-subtle sm:flex">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> naviguer
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd> ouvrir
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
