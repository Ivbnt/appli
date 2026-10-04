"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/** Applique la préférence de thème enregistrée sur le compte (une fois, au chargement). */
export function ThemeSync({ preference }: { preference: "light" | "dark" | "system" }) {
  const { theme, setTheme } = useTheme();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || theme === undefined) return;
    done.current = true;
    if (theme !== preference) setTheme(preference);
  }, [theme, preference, setTheme]);
  return null;
}
