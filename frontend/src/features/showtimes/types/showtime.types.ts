import type { MovieStatus } from '@/features/movies/types/movie.types';

export type ShowtimeStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

export interface Showtime {
  id: number;
  movieId: number;
  movieStatus?: MovieStatus;
  cinemaId: number;
  cinemaName: string;
  roomId: number;
  roomName: string;
  startsAt: string; // ISO 8601 UTC timestamp
  endsAt: string;
  cleanupMinutes: number;
  basePrice: number;
  vipSurcharge: number;
  status: ShowtimeStatus;
  schedulePlanId?: number | null;
}

export interface ShowtimeQueryParams {
  movieId: number;
  date: string; // YYYY-MM-DD in Asia/Ho_Chi_Minh
  cinemaId?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface MovieSummary {
  id: number;
  title: string;
  posterUrl: string | null;
  ageRating: string | null;
  durationMinutes: number;
  status?: MovieStatus;
}

export interface CinemaMovieShowtimeGroup {
  movie: MovieSummary;
  showtimes: Showtime[];
}

export interface CinemaShowtimesQueryParams {
  cinemaId: number;
  date: string; // YYYY-MM-DD in Asia/Ho_Chi_Minh
  page?: number;
  size?: number;
}

import type { SeatType } from '@/features/cinemas/types/cinema.types';
export type { SeatType };
export type SeatState = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface SeatItem {
  seatId: number;
  label: string;
  seatType: SeatType;
  status: SeatState;
  price: number;
}

export interface SeatMapResponse {
  showtimeId: number;
  startsAt: string;
  bookingClosesAt: string;
  seats: SeatItem[];
}

export type ShowtimeResponse = Showtime;

export interface ShowtimeCreatedResponse {
  showtime: Showtime;
  createdSeatCount: number;
}

export interface ShowtimeRequest {
  movieId: number;
  roomId: number;
  startsAt: string; // ISO 8601 UTC timestamp with Z
  endsAt: string;   // ISO 8601 UTC timestamp with Z
  cleanupMinutes?: number;
  basePrice: number;
  vipSurcharge?: number;
}

export interface AdminShowtimeFilters {
  cinemaId?: number;
  roomId?: number;
  movieId?: number;
  planId?: number;
  date?: string; // YYYY-MM-DD in Asia/Ho_Chi_Minh
  status?: ShowtimeStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export interface BatchAutoGenerateShowtimesRequest {
  cinemaId: number;
  roomIds: number[];
  movieIds: number[];
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  daysOfWeek: number[]; // 1..7 (ISO)
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
  slotStepMinutes?: number;
  cleanupMinutes?: number;
  staggerMinutes?: number;
  basePrice: number;
  vipSurcharge?: number;
}

export interface BatchShowtimePreviewItem {
  movieId: number;
  movieTitle: string;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
}

export interface BatchRoomDateResult {
  date: string;
  outcome: 'SUCCESS' | 'PARTIAL' | 'SKIPPED' | 'FAILED';
  plannedCount: number;
  createdCount: number;
  skippedCount: number;
  message: string | null;
  showtimes: BatchShowtimePreviewItem[];
}

export interface BatchRoomGenerationResult {
  roomId: number;
  roomName: string;
  plannedCount: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  dates: BatchRoomDateResult[];
}

export interface BatchAutoGenerateShowtimesResponse {
  cinemaId: number;
  cinemaName: string;
  from: string;
  to: string;
  preview: boolean;
  totalPlannedCount: number;
  totalCreatedCount: number;
  totalSkippedCount: number;
  totalFailedCount: number;
  rooms: BatchRoomGenerationResult[];
}
