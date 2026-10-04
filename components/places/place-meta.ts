import { BedDouble, Coffee, MapPin, Plane, Sparkles, UtensilsCrossed, Wine, type LucideIcon } from "lucide-react";
import type { PlaceCategory } from "@/lib/domain";

export const PLACE_ICONS: Record<PlaceCategory, LucideIcon> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  bar: Wine,
  hotel: BedDouble,
  travel: Plane,
  activity: Sparkles,
  other: MapPin,
};
