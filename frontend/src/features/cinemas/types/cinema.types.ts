export type CinemaStatus = 'ACTIVE' | 'INACTIVE';
export type RoomStatus = 'ACTIVE' | 'MAINTENANCE';
export type PhysicalSeatStatus = 'ACTIVE' | 'MAINTENANCE';
export type SeatType = 'STANDARD' | 'VIP';

export interface CinemaRoom {
  id: number;
  cinemaId: number;
  name: string;
  status: RoomStatus;
}

export interface Cinema {
  id: number;
  name: string;
  address: string;
  status: CinemaStatus;
  hotline?: string;
  fax?: string;
  mapEmbedUrl?: string;
  images?: string[];
  roomsCount?: number;
  roomTypes?: string[];
  city?: string;
}

export interface CinemaDetail extends Cinema {
  rooms: CinemaRoom[];
}

export interface CinemaMeta {
  bannerImage: string;
  images: string[];
  hotline: string;
  fax?: string;
  mapEmbedUrl: string;
  city: string;
  roomTypes: string[];
  features: string[];
}

export interface RoomRequest {
  cinemaId: number;
  name: string;
  status: RoomStatus;
}

export interface RoomResponse {
  id: number;
  cinemaId: number;
  name: string;
  status: RoomStatus;
}

export interface SeatResponse {
  id: number;
  roomId: number;
  seatRow: string;
  seatNumber: number;
  label: string;
  seatType: SeatType;
  status: PhysicalSeatStatus;
}

export interface SeatRequest {
  seatRow: string;
  seatNumber: number;
  seatType: SeatType;
  status: PhysicalSeatStatus;
}

export interface SeatBatchRequest {
  seats: SeatRequest[];
}
