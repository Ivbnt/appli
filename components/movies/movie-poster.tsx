import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function MoviePoster({ url, title, className }: { url: string | null; title: string; className?: string }) {
  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-muted ring-1 ring-border", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- affiche TMDB déjà dimensionnée
        <img src={url} alt={`Affiche de ${title}`} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center">
          <Clapperboard className="size-6 text-subtle" strokeWidth={1.5} />
          <span className="line-clamp-3 text-xs font-medium text-muted">{title}</span>
        </div>
      )}
    </div>
  );
}
