"use client";

import { motion, useReducedMotion } from "motion/react";

/** Anneau de score sobre (pourcentage d'accord). */
export function ScoreRing({ value, size = 64, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const reduce = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(value * 100)} %`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-surface-muted" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? circumference * (1 - value) : circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="tabular absolute text-sm font-semibold" style={{ fontSize: size / 4.2 }}>
        {Math.round(value * 100)}
        <span className="text-[0.6em] text-muted">%</span>
      </span>
    </div>
  );
}
