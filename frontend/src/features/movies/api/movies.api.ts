import { httpClient } from '@/shared/api/http-client';
import type { PageResponse } from '@/shared/types/api.types';
import type { Movie, MovieQueryParams, MovieRequest, AdminMovieQueryParams } from '../types/movie.types';

export const moviesApi = {
  /**
   * Public: List movies (filters out HIDDEN).
   */
  list: async (params?: MovieQueryParams): Promise<PageResponse<Movie>> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.genre) query.append('genre', params.genre);
    if (params?.page !== undefined) query.append('page', params.page.toString());
    if (params?.size !== undefined) query.append('size', params.size.toString());
    if (params?.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const endpoint = queryString ? `/movies?${queryString}` : '/movies';
    const res = await httpClient.get<PageResponse<Movie>>(endpoint);
    return res.data;
  },

  /**
   * Public: Read public movie detail (throws 404 for HIDDEN).
   */
  getById: async (id: number): Promise<Movie> => {
    const res = await httpClient.get<Movie>(`/movies/${id}`);
    return res.data;
  },

  /**
   * Admin: List movies including HIDDEN.
   * If status is omitted, returns all movies.
   */
  getAdminMovies: async (params?: AdminMovieQueryParams): Promise<PageResponse<Movie>> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.keyword) query.append('keyword', params.keyword);
    if (params?.genre) query.append('genre', params.genre);
    if (params?.page !== undefined) query.append('page', params.page.toString());
    if (params?.size !== undefined) query.append('size', params.size.toString());
    if (params?.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const endpoint = queryString ? `/admin/movies?${queryString}` : '/admin/movies';
    const res = await httpClient.get<PageResponse<Movie>>(endpoint);
    return res.data;
  },

  /**
   * Admin: Read movie detail including HIDDEN.
   */
  getAdminMovieById: async (id: number): Promise<Movie> => {
    const res = await httpClient.get<Movie>(`/admin/movies/${id}`);
    return res.data;
  },

  /**
   * Admin: Create a new movie metadata.
   */
  create: async (data: MovieRequest): Promise<Movie> => {
    const res = await httpClient.post<Movie>('/admin/movies', data);
    return res.data;
  },

  /**
   * Admin: Update movie metadata or change status to HIDDEN.
   */
  update: async (id: number, data: MovieRequest): Promise<Movie> => {
    const res = await httpClient.put<Movie>(`/admin/movies/${id}`, data);
    return res.data;
  },

  /**
   * Admin: Upload JPEG/PNG poster to Cloudinary via backend.
   */
  uploadPoster: async (id: number, file: File): Promise<Movie> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await httpClient.post<Movie>(`/admin/movies/${id}/poster`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};
