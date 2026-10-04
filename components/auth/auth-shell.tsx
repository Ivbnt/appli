import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { APP_TAGLINE } from "@/lib/brand";

/** Mise en page des écrans hors application : connexion, invitation, accueil. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-safe">
      <header className="mx-auto flex w-full max-w-[400px] items-center justify-center pt-12 pb-10 sm:pt-20">
        <Link href="/" aria-label="Accueil" className="rounded-lg">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[400px] flex-1">{children}</main>
      <footer className="pb-safe mx-auto w-full max-w-[400px] py-8 text-center text-xs text-subtle">{APP_TAGLINE}</footer>
    </div>
  );
}
