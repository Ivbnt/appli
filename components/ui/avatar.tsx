import { cn, initials } from "@/lib/utils";

const SIZES = { xs: "size-5 text-[9px]", sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-14 text-base", xl: "size-20 text-xl" };

// Teintes neutres et désaturées : aucune couleur « romantique ».
const TONES = [
  "bg-[oklch(0.92_0.02_250)] text-[oklch(0.38_0.06_250)] dark:bg-[oklch(0.32_0.03_250)] dark:text-[oklch(0.86_0.04_250)]",
  "bg-[oklch(0.92_0.02_160)] text-[oklch(0.38_0.05_160)] dark:bg-[oklch(0.32_0.03_160)] dark:text-[oklch(0.86_0.04_160)]",
  "bg-[oklch(0.93_0.02_80)] text-[oklch(0.4_0.05_70)] dark:bg-[oklch(0.33_0.03_70)] dark:text-[oklch(0.87_0.04_80)]",
  "bg-[oklch(0.92_0.015_290)] text-[oklch(0.38_0.05_290)] dark:bg-[oklch(0.32_0.03_290)] dark:text-[oklch(0.86_0.04_290)]",
];

function toneFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export type AvatarProps = {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight ring-1 ring-black/5 select-none dark:ring-white/10",
        SIZES[size],
        !src && toneFor(name),
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- image privée servie par URL signée
        <img src={src} alt={name} className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span aria-label={name}>{initials(name)}</span>
      )}
    </span>
  );
}

export function AvatarStack({ people, size = "sm" }: { people: { name: string; src?: string | null }[]; size?: AvatarProps["size"] }) {
  return (
    <span className="flex -space-x-1.5">
      {people.map((person) => (
        <Avatar key={person.name} {...person} size={size} className="ring-2 ring-surface" />
      ))}
    </span>
  );
}
