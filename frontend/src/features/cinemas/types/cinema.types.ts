export type CinemaStatus = 'ACTIVE' | 'INACTIVE';

export interface CinemaRoom {
  id: number;
  cinemaId: number;
  name: string;
  status: 'ACTIVE' | 'MAINTENANCE';
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
