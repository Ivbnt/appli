import type { AlbumView, MilestoneView, PhotoView } from "@/server/services/photos";

export type Photo = PhotoView;
export type Album = AlbumView;
export type Milestone = MilestoneView;
export type PhotoLinks = { albumId?: string | null; placeId?: string | null; tripId?: string | null };
