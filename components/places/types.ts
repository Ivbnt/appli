import type { PlaceRow } from "@/server/services/places";

export type Place = PlaceRow;
export type TripOption = { id: string; title: string };
export type PlacePhoto = { id: string; thumbUrl: string; placeId: string };
