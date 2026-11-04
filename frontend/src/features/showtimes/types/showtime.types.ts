export type ShowtimeStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

export interface Showtime {
  id: number;
  movieId: number;
  movieTitle?: string;
  roomId: number;
  roomName?: string;
  cinemaId?: number;
  cinemaName?: string;
  startsAt: string;
  endsAt: string;
  cleanupMinutes: number;
  basePrice: number;
  vipSurcharge: number;
  status: ShowtimeStatus;
}

export type SeatType = 'STANDARD' | 'VIP';
export type SeatState = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface ShowtimeSeat {
  id: number;
  showtimeId: number;
  seatId: number;
  seatRow: string;
  seatNumber: number;
  seatType: SeatType;
  status: SeatState;
  price: number;
}
