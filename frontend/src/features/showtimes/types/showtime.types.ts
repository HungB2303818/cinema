export type ShowtimeStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

export interface Showtime {
  id: number;
  movieId: number;
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
  date?: string; // YYYY-MM-DD in Asia/Ho_Chi_Minh
  status?: ShowtimeStatus;
  page?: number;
  size?: number;
  sort?: string;
}
