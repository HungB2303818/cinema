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

/**
 * FE-09: Admin movie request payload matching backend MovieRequest DTO
 */
export interface MovieRequest {
  title: string;
  durationMinutes: number;
  status: MovieStatus;
  description?: string | null;
  genre?: string | null;
  ageRating?: string | null;
  releaseDate?: string | null;
  posterUrl?: string | null;
}

/**
 * FE-09: Admin movie query parameters.
 * When status is undefined, backend returns movies of all statuses (including HIDDEN).
 */
export interface AdminMovieQueryParams {
  keyword?: string;
  status?: MovieStatus;
  genre?: string;
  page?: number;
  size?: number;
  sort?: string;
}
