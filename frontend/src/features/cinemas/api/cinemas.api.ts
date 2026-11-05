import { httpClient } from '@/shared/api/http-client';
import type { PageResponse } from '@/shared/types/api.types';
import type {
  Cinema,
  CinemaDetail,
  RoomRequest,
  RoomResponse,
  SeatBatchRequest,
  SeatRequest,
  SeatResponse,
} from '../types/cinema.types';

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

export const adminCinemasApi = {
  listCinemas: async (page = 0, size = 20, sort = 'id,asc'): Promise<PageResponse<Cinema>> => {
    const res = await httpClient.get<PageResponse<Cinema>>('/admin/cinemas', {
      params: { page, size, sort },
    });
    return res.data;
  },

  listRooms: async (cinemaId: number, page = 0, size = 20, sort = 'id,asc'): Promise<PageResponse<RoomResponse>> => {
    const res = await httpClient.get<PageResponse<RoomResponse>>(`/admin/cinemas/${cinemaId}/rooms`, {
      params: { page, size, sort },
    });
    return res.data;
  },

  createRoom: async (payload: RoomRequest): Promise<RoomResponse> => {
    const res = await httpClient.post<RoomResponse>('/admin/rooms', payload);
    return res.data;
  },

  updateRoom: async (id: number, payload: RoomRequest): Promise<RoomResponse> => {
    const res = await httpClient.put<RoomResponse>(`/admin/rooms/${id}`, payload);
    return res.data;
  },

  listSeats: async (roomId: number): Promise<SeatResponse[]> => {
    const res = await httpClient.get<SeatResponse[]>(`/admin/rooms/${roomId}/seats`);
    return res.data || [];
  },

  createSeats: async (roomId: number, payload: SeatBatchRequest): Promise<SeatResponse[]> => {
    const res = await httpClient.post<SeatResponse[]>(`/admin/rooms/${roomId}/seats`, payload);
    return res.data || [];
  },

  updateSeat: async (roomId: number, seatId: number, payload: SeatRequest): Promise<SeatResponse> => {
    const res = await httpClient.put<SeatResponse>(`/admin/rooms/${roomId}/seats/${seatId}`, payload);
    return res.data;
  },
};
