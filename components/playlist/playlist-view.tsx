"use client";

import { ExternalLink, Link2, Music2, RefreshCw, Unplug } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { cn, formatDuration } from "@/lib/utils";
import { disconnectSpotifyAction, removePlaylistAction, setPlaylistAction } from "@/server/actions/playlist";
import type { Playlist } from "@/server/services/playlist";

const ERRORS: Record<string, string> = {
  config: "Spotify n'est pas configuré : ajoutez SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET dans le fichier .env.",
  state: "La connexion à Spotify a expiré. Réessayez.",
  denied: "La connexion à Spotify a été annulée.",
  exchange: "Spotify n'a pas pu valider la connexion. Réessayez dans un instant.",
};

function formatMs(ms: number) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function PlaylistForm({ defaultValue = "", onDone }: { defaultValue?: string; onDone?: () => void }) {
  const [url, setUrl] = React.useState(defaultValue);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await setPlaylistAction({ url });
          if (!result.ok) return setError(result.error);
          setError(null);
          toast.success("Playlist synchronisée");
          onDone?.();
        });
      }}
      className="flex flex-col gap-3"
    >
      <FormError message={error} />
      <Field label="Lien de la playlist" htmlFor="playlist-url" hint="Dans Spotify : ⋯ → Partager → Copier le lien de la playlist.">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/…" inputMode="url" />
      </Field>
      <Button type="submit" loading={pending} disabled={!url.trim()} className="self-start">
        <Link2 /> Afficher la playlist
      </Button>
    </form>
  );
}

export function PlaylistView({
  playlist,
  apiConfigured,
  connection,
}: {
  playlist: Playlist | null;
  apiConfigured: boolean;
  connection: { displayName: string | null } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const [changing, setChanging] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const error = searchParams.get("error");
    if (error) toast.error(ERRORS[error] ?? "Connexion à Spotify impossible.");
    if (searchParams.get("connected")) toast.success("Spotify est connecté");
    if (error || searchParams.get("connected")) router.replace(pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  const refresh = () =>
    startTransition(async () => {
      if (!playlist) return;
      const result = await setPlaylistAction({ url: playlist.url });
      if (!result.ok) toast.error(result.error);
      else toast.success("Playlist à jour");
    });

  const totalMs = playlist?.tracks?.reduce((sum, t) => sum + t.durationMs, 0) ?? 0;

  const connectionCard = apiConfigured ? (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
      <span className={cn("size-2 rounded-full", connection ? "bg-success" : "bg-border-strong")} />
      <span className="flex-1">
        {connection ? (
          <>
            Connecté à Spotify{connection.displayName && <> en tant que <span className="font-medium">{connection.displayName}</span></>}
          </>
        ) : (
          "Connectez Spotify pour afficher la liste complète des morceaux, y compris d'une playlist privée ou collaborative."
        )}
      </span>
      {connection ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!(await confirm({ title: "Déconnecter Spotify ?", description: "Les jetons d'accès sont supprimés. La playlist reste affichée.", confirmLabel: "Déconnecter" }))) return;
            const result = await disconnectSpotifyAction({});
            if (!result.ok) toast.error(result.error);
          }}
        >
          <Unplug /> Déconnecter
        </Button>
      ) : (
        <a href="/api/spotify/connect" className={buttonVariants({ size: "sm" })}>
          Connecter Spotify
        </a>
      )}
    </div>
  ) : (
    <p className="rounded-2xl border border-border bg-surface-muted px-4 py-3 text-xs text-muted">
      Pour afficher la liste détaillée des morceaux, configurez l&apos;API Spotify (<code className="font-mono">SPOTIFY_CLIENT_ID</code>,{" "}
      <code className="font-mono">SPOTIFY_CLIENT_SECRET</code>). En attendant, le lecteur officiel de Spotify est utilisé.
    </p>
  );

  if (!playlist || changing) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs sm:p-8">
          <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-surface-muted">
            <Music2 className="size-5 text-muted" />
          </span>
          <h2 className="text-heading">{changing ? "Changer de playlist" : "Votre playlist commune"}</h2>
          <p className="mt-1 mb-6 text-sm text-muted">Collez le lien de la playlist que vous partagez sur Spotify.</p>
          <PlaylistForm onDone={() => setChanging(false)} />
          {changing && (
            <Button variant="ghost" className="mt-2" onClick={() => setChanging(false)}>
              Annuler
            </Button>
          )}
        </div>
        {connectionCard}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="aspect-square w-40 shrink-0 overflow-hidden rounded-2xl bg-surface-muted shadow-md ring-1 ring-border sm:w-52">
          {playlist.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- pochette servie par Spotify
            <img src={playlist.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Music2 className="size-10 text-subtle" strokeWidth={1.25} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-eyebrow tracking-[0.1em] uppercase">Playlist</p>
          <h2 className="text-display mt-1 break-words">{playlist.name}</h2>
          {playlist.description && <p className="mt-2 max-w-2xl text-sm text-muted">{playlist.description}</p>}
          <p className="mt-3 text-sm text-muted">
            {[
              playlist.ownerName,
              playlist.trackCount !== null ? `${playlist.trackCount} titre${playlist.trackCount > 1 ? "s" : ""}` : null,
              totalMs ? formatDuration(Math.round(totalMs / 60000)) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={playlist.url} target="_blank" rel="noreferrer noopener" className={buttonVariants()}>
              <ExternalLink /> Ouvrir dans Spotify
            </a>
            <Button variant="secondary" onClick={refresh} loading={pending}>
              <RefreshCw /> Actualiser
            </Button>
            <Button variant="ghost" onClick={() => setChanging(true)}>
              Changer
            </Button>
            <Button
              variant="danger-ghost"
              onClick={async () => {
                if (!(await confirm({ title: "Retirer la playlist ?", confirmLabel: "Retirer", destructive: true }))) return;
                const result = await removePlaylistAction({});
                if (!result.ok) toast.error(result.error);
              }}
            >
              Retirer
            </Button>
          </div>
          {playlist.lastSyncedAt && <p className="mt-3 text-xs text-subtle">Synchronisée le {formatDate(playlist.lastSyncedAt, "long")}</p>}
        </div>
      </div>

      {connectionCard}

      {playlist.tracks && playlist.tracks.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="hidden grid-cols-[40px_1fr_1fr_64px] gap-4 border-b border-border px-4 py-2.5 text-xs font-medium text-subtle sm:grid">
            <span className="text-right">#</span>
            <span>Titre</span>
            <span>Album</span>
            <span className="text-right">Durée</span>
          </div>
          <ol>
            {playlist.tracks.map((track, index) => (
              <li key={`${track.id}-${index}`}>
                <a
                  href={track.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-surface-hover/70 sm:grid-cols-[40px_1fr_1fr_64px]"
                >
                  <span className="tabular hidden text-right text-sm text-subtle sm:block">{index + 1}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    {track.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- pochette servie par Spotify
                      <img src={track.imageUrl} alt="" loading="lazy" className="size-10 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="size-10 shrink-0 rounded-md bg-surface-muted" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{track.name}</span>
                      <span className="block truncate text-xs text-muted">{track.artists.join(", ")}</span>
                    </span>
                  </span>
                  <span className="hidden truncate text-sm text-muted sm:block">{track.album}</span>
                  <span className="tabular text-right text-sm text-muted">{formatMs(track.durationMs)}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <iframe
          title={`Lecteur Spotify : ${playlist.name}`}
          src={`https://open.spotify.com/embed/playlist/${playlist.spotifyId}?utm_source=generator&theme=0`}
          className="h-[520px] w-full rounded-2xl border-0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
    </div>
  );
}
