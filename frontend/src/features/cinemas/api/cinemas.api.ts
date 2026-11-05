import { httpClient } from '@/shared/api/http-client';
import type { Cinema, CinemaDetail } from '../types/cinema.types';

export const cinemasApi = {
  list: async (): Promise<Cinema[]> => {
    const res = await httpClient.get<Cinema[]>('/cinemas');
    return res.data || [];
  },

  getById: async (id: number): Promise<CinemaDetail> => {
    const res = await httpClient.get<CinemaDetail>(`/cinemas/${id}`);
    return res.data;
  },
};
