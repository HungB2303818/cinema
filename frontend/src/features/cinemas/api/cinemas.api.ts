import { httpClient } from '@/shared/api/http-client';
import type { Cinema, CinemaDetail } from '../types/cinema.types';
import { FALLBACK_CINEMAS, CINEMA_METADATA_MAP } from '../data/cinemasFallback';

export const cinemasApi = {
  list: async (): Promise<Cinema[]> => {
    try {
      const res = await httpClient.get<Cinema[]>('/cinemas');
      if (res.data && res.data.length > 0) {
        return res.data.map((c) => {
          const meta = CINEMA_METADATA_MAP[c.name];
          const fallback = FALLBACK_CINEMAS.find((f) => f.name === c.name || f.id === c.id);
          return {
            ...c,
            city: meta?.city || (c.address.includes('Cần Thơ') ? 'Cần Thơ' : 'Hà Nội'),
            hotline: meta?.hotline || '1900 6017',
            images: meta?.images || fallback?.images || [],
            roomTypes: meta?.roomTypes || fallback?.roomTypes || ['2D', '3D'],
            roomsCount: fallback?.rooms?.length || 4,
            mapEmbedUrl: meta?.mapEmbedUrl || '',
          };
        });
      }
      return FALLBACK_CINEMAS;
    } catch {
      return FALLBACK_CINEMAS;
    }
  },

  getById: async (id: number): Promise<CinemaDetail> => {
    try {
      const res = await httpClient.get<CinemaDetail>(`/cinemas/${id}`);
      const data = res.data;
      const meta = CINEMA_METADATA_MAP[data.name];
      const fallback = FALLBACK_CINEMAS.find((f) => f.name === data.name || f.id === data.id);
      return {
        ...data,
        city: meta?.city || (data.address.includes('Cần Thơ') ? 'Cần Thơ' : 'Hà Nội'),
        hotline: meta?.hotline || '1900 6017',
        fax: meta?.fax,
        images: meta?.images || fallback?.images || [],
        roomTypes: meta?.roomTypes || fallback?.roomTypes || ['2D', '3D'],
        roomsCount: data.rooms?.length || fallback?.rooms?.length || 4,
        mapEmbedUrl: meta?.mapEmbedUrl || fallback?.mapEmbedUrl || '',
        rooms: (data.rooms && data.rooms.length > 0) ? data.rooms : (fallback?.rooms || []),
      };
    } catch {
      const fallback = FALLBACK_CINEMAS.find((c) => c.id === id) || FALLBACK_CINEMAS[0];
      return fallback;
    }
  },
};
