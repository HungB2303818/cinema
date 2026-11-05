export type MovieStatus = 'UPCOMING' | 'SHOWING' | 'ENDED' | 'HIDDEN';

export type AgeRating = 'P' | 'K' | 'T13' | 'T16' | 'T18' | 'C';

export interface Movie {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  genre: string | null;
  ageRating: string | null;
  releaseDate: string | null;
  posterUrl: string | null;
  status: MovieStatus;
}

export interface MovieQueryParams {
  keyword?: string;
  status?: MovieStatus;
  genre?: string;
  page?: number;
  size?: number;
  sort?: string;
}
