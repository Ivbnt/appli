"use client";

import * as React from "react";

/**
 * Petit état mémorisé dans le navigateur (cartes déjà tirées, option 18+…).
 * Lecture via useSyncExternalStore : pas de décalage d'hydratation, et toutes les
 * instances d'une même clé restent synchronisées. Si le stockage est indisponible
 * (navigation privée…), l'état vit simplement en mémoire.
 */
const memory = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // stockage indisponible : la valeur reste en mémoire
  }
  listeners.get(key)?.forEach((listener) => listener());
}

const parsed = new Map<string, { raw: string | null; value: unknown }>();

export function useLocalState<T>(key: string, fallback: T): [T, (next: T | ((previous: T) => T)) => void] {
  const subscribe = React.useCallback(
    (listener: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      return () => set.delete(listener);
    },
    [key],
  );

  const getSnapshot = React.useCallback(() => {
    const raw = read(key);
    const cached = parsed.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    let value: T = fallback;
    if (raw !== null) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        value = fallback;
      }
    }
    parsed.set(key, { raw, value });
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la valeur par défaut ne sert qu'en l'absence de donnée
  }, [key]);

  const value = React.useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = React.useCallback(
    (next: T | ((previous: T) => T)) => {
      const current = getSnapshot();
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(current) : next;
      write(key, JSON.stringify(resolved));
    },
    [key, getSnapshot],
  );

  return [value, setValue];
}
