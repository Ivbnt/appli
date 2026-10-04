"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { fromLocalInput } from "@/lib/dates";
import { ALMA_OPEN_EVENT, ALMA_SINCE } from "@/lib/easter-egg";
import { unlockAlmaAction } from "@/server/actions/fun";

const CODE = "alma";

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Easter egg : taper A, L, M, A (hors d'un champ de saisie), ou « alma » dans la recherche,
 * ouvre un compteur depuis le 1er septembre 2026. La première fois, la date rejoint l'agenda.
 */
export function AlmaEasterEgg() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const unlockRequested = React.useRef(false);

  const show = React.useCallback(() => {
    setOpen(true);
    if (unlockRequested.current) return;
    unlockRequested.current = true;
    void unlockAlmaAction({}).then((result) => {
      if (!result.ok) {
        unlockRequested.current = false;
        return;
      }
      if (result.data.added) {
        toast.success("Alma a rejoint votre agenda", { description: "Le 1er septembre, chaque année." });
        router.refresh();
      }
    });
  }, [router]);

  React.useEffect(() => {
    let typed = "";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1 || isEditable(event.target)) return;
      typed = (typed + event.key.toLowerCase()).slice(-CODE.length);
      if (typed === CODE) {
        typed = "";
        show();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(ALMA_OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(ALMA_OPEN_EVENT, show);
    };
  }, [show]);

  return <AnimatePresence>{open && <AlmaOverlay onClose={() => setOpen(false)} />}</AnimatePresence>;
}

// ── Compteur ───────────────────────────────────────────────────

const subscribeToSeconds = (onTick: () => void) => {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
};
const currentSecond = () => Math.floor(Date.now() / 1000);

function useElapsed(since: Date) {
  const now = React.useSyncExternalStore(subscribeToSeconds, currentSecond, () => 0);
  const total = Math.max(0, now - Math.floor(since.getTime() / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

// Pseudo-aléatoire déterministe : les étoiles restent stables d'un rendu à l'autre.
const noise = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const STARS = Array.from({ length: 48 }, (_, i) => ({
  left: noise(i, 1) * 100,
  top: noise(i, 2) * 100,
  size: 1 + noise(i, 3) * 2.5,
  delay: noise(i, 4) * 3,
  duration: 2.5 + noise(i, 5) * 3,
  drift: 10 + noise(i, 6) * 30,
}));

function AlmaOverlay({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion();
  const since = React.useMemo(() => fromLocalInput(ALMA_SINCE), []);
  const { days, hours, minutes, seconds } = useElapsed(since);
  const close = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    close.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const units = [
    { value: days, label: days > 1 ? "jours" : "jour" },
    { value: hours, label: hours > 1 ? "heures" : "heure" },
    { value: minutes, label: "minutes" },
    { value: seconds, label: "secondes" },
  ];

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Alma"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      transition={{ duration: 0.6 }}
      onClick={onClose}
    >
      {/* Ciel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#3b1d5e_0%,#1a1033_45%,#07060d_100%)]" />
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: "conic-gradient(from 0deg, #f9c66b55, #f472b655, #a78bfa55, #60a5fa55, #f9c66b55)" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />

      {/* Étoiles */}
      {STARS.map((star, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-white"
          style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size, boxShadow: "0 0 6px 1px rgba(255,255,255,.6)" }}
          initial={{ opacity: 0, scale: 0 }}
          animate={reduce ? { opacity: 0.7, scale: 1 } : { opacity: [0, 1, 0.2, 1, 0], scale: [0, 1, 0.8, 1, 0], y: [0, -star.drift] }}
          transition={{ duration: star.duration, delay: star.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div className="relative flex flex-col items-center text-center" onClick={(event) => event.stopPropagation()}>
        {/* Halo d'apparition */}
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute top-12 left-1/2 size-40 -translate-x-1/2 rounded-full bg-white/70 blur-2xl"
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        <h2 className="flex text-[clamp(4rem,16vw,9rem)] leading-none font-semibold tracking-tight">
          {"Alma".split("").map((letter, i) => (
            <motion.span
              key={i}
              className="bg-[linear-gradient(110deg,#fde68a,#f9a8d4,#c4b5fd,#93c5fd,#fde68a)] bg-[length:250%_100%] bg-clip-text text-transparent"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, filter: "blur(14px)" }}
              animate={
                reduce
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, filter: "blur(0px)", backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
              }
              transition={{
                opacity: { delay: 0.3 + i * 0.18, duration: 0.8 },
                y: { delay: 0.3 + i * 0.18, duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                filter: { delay: 0.3 + i * 0.18, duration: 0.9 },
                backgroundPosition: { duration: 6, repeat: Infinity, ease: "linear" },
              }}
            >
              {letter}
            </motion.span>
          ))}
        </h2>

        <motion.p
          className="mt-3 text-base tracking-wide text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          depuis le 1<sup>er</sup> septembre 2026
        </motion.p>

        <div className="mt-10 grid grid-cols-4 gap-2 sm:gap-4" aria-live="off">
          {units.map((unit, i) => (
            <motion.div
              key={unit.label.replace(/s$/, "")}
              className="flex min-w-[4.5rem] flex-col items-center rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-4 backdrop-blur-md sm:min-w-28 sm:px-5 sm:py-5"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1.4 + i * 0.12, type: "spring", stiffness: 220, damping: 20 }}
            >
              <span className="relative h-[1.15em] overflow-hidden text-3xl font-semibold text-white tabular sm:text-5xl">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={unit.value}
                    className="block"
                    initial={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {i === 0 ? unit.value : String(unit.value).padStart(2, "0")}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="mt-1 text-[11px] tracking-wide text-white/50 uppercase sm:text-xs">{unit.label}</span>
            </motion.div>
          ))}
        </div>

        <p className="sr-only">
          {days} jours, {hours} heures, {minutes} minutes et {seconds} secondes depuis le 1er septembre 2026.
        </p>
      </div>

      <motion.button
        ref={close}
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-5 right-5 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        <X className="size-5" />
      </motion.button>
    </motion.div>
  );
}
