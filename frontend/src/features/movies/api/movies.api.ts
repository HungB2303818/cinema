import { httpClient } from '@/shared/api/http-client';
import type { PageResponse } from '@/shared/types/api.types';
import type { Movie, MovieQueryParams } from '../types/movie.types';

export const moviesApi = {
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

  getById: async (id: number): Promise<Movie> => {
    const res = await httpClient.get<Movie>(`/movies/${id}`);
    return res.data;
  },
};
