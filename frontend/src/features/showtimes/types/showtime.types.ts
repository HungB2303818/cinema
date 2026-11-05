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

export type SeatType = 'STANDARD' | 'VIP';
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
