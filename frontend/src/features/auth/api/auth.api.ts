import { httpClient } from '@/shared/api/http-client';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth.types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await httpClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const res = await httpClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await httpClient.get<User>('/auth/me');
    return res.data;
  },
};
