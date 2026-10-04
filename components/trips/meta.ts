import { BedDouble, Car, FileText, Music, Plane, Ticket, TrainFront, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { ReservationType } from "@/lib/domain";

export const RESERVATION_ICONS: Record<ReservationType, LucideIcon> = {
  flight: Plane,
  train: TrainFront,
  hotel: BedDouble,
  restaurant: UtensilsCrossed,
  concert: Music,
  activity: Ticket,
  rental: Car,
  other: FileText,
};

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "JPY"];

export function formatPrice(price: string | null, currency: string) {
  if (price === null) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(price));
}
