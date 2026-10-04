import {
  CalendarDays,
  CheckSquare,
  Clapperboard,
  Home,
  Images,
  type LucideIcon,
  Map,
  Music2,
  Plane,
  Settings,
  Sparkles,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean };

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home, mobile: true },
  { href: "/map", label: "Carte", icon: Map },
  { href: "/tasks", label: "À faire", icon: CheckSquare, mobile: true },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays, mobile: true },
  { href: "/memories", label: "Souvenirs", icon: Images, mobile: true },
  { href: "/movies", label: "Films", icon: Clapperboard },
  { href: "/playlist", label: "Playlist", icon: Music2 },
  { href: "/trips", label: "Voyages", icon: Plane },
  { href: "/fun", label: "Fun", icon: Sparkles },
];

export const SETTINGS_NAV: NavItem = { href: "/settings", label: "Paramètres", icon: Settings };

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function titleFor(pathname: string): string {
  if (pathname.startsWith("/settings")) return "Paramètres";
  return [...MAIN_NAV].reverse().find((item) => isActive(pathname, item.href))?.label ?? "";
}
