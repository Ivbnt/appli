import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Monogramme : deux cercles qui se rejoignent. Sobre, sans symbole romantique. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-7", className)}>
      <rect width="64" height="64" rx="15" className="fill-primary" />
      <circle cx="26" cy="32" r="11" fill="none" strokeWidth="3.5" className="stroke-primary-foreground" />
      <circle cx="38" cy="32" r="11" fill="none" strokeWidth="3.5" strokeOpacity="0.55" className="stroke-primary-foreground" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.02em]">{APP_NAME}</span>
    </span>
  );
}
