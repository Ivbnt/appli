"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

/**
 * État local initialisé depuis une prop et resynchronisé quand la prop change
 * (par exemple après un rafraîchissement serveur). Mise à jour pendant le rendu,
 * comme recommandé par React, plutôt que dans un effet.
 */
export function useSyncedState<T>(value: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState(value);
  const [previous, setPrevious] = React.useState(value);
  if (!Object.is(previous, value)) {
    setPrevious(value);
    setState(value);
  }
  return [state, setState];
}

/** Exécute `onChange` (pendant le rendu) quand `value` change — typiquement pour réinitialiser un formulaire à l'ouverture. */
export function useOnChange<T>(value: T, onChange: (value: T) => void) {
  const [previous, setPrevious] = React.useState<{ value: T } | null>(null);
  if (previous === null || !Object.is(previous.value, value)) {
    setPrevious({ value });
    onChange(value);
  }
}

const subscribeNothing = () => () => undefined;

/** Vrai uniquement côté navigateur, après l'hydratation. */
export function useMounted() {
  return React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

/**
 * Paramètres d'URL « d'intention » (?new=1, ?task=…) : déclenche `onIntent` une fois,
 * puis nettoie l'URL. Utilisé par la recherche globale et les actions rapides.
 */
export function useSearchParamIntent(names: string[], onIntent: (params: URLSearchParams) => void, sideEffect?: (params: URLSearchParams) => void) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const signature = names.map((name) => `${name}=${searchParams.get(name) ?? ""}`).join("&");
  const active = names.some((name) => searchParams.has(name));
  const [handled, setHandled] = React.useState<string | null>(null);

  if (active && handled !== signature) {
    setHandled(signature);
    onIntent(new URLSearchParams(searchParams));
  } else if (!active && handled !== null) {
    setHandled(null);
  }

  const sideEffectRef = React.useRef(sideEffect);
  React.useEffect(() => {
    sideEffectRef.current = sideEffect;
  });

  React.useEffect(() => {
    if (!active) return;
    const params = new URLSearchParams(searchParams);
    sideEffectRef.current?.(params);
    for (const name of names) params.delete(name);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dépend de la signature des paramètres suivis
  }, [active, signature, pathname, router]);
}
