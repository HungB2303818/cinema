import { httpClient } from '@/shared/api/http-client';
import type { PageResponse } from '@/shared/types/api.types';
import type {
  GenerateScheduleRequest,
  GenerationLog,
  GenerationLogFilters,
  GenerationSummary,
  SchedulePlan,
  SchedulePlanFilters,
  SchedulePlanRequest,
  SchedulePlanSummary,
} from '../types/schedule-plan.types';

export const adminSchedulePlansApi = {
  list: async (
    filters: SchedulePlanFilters = {}
  ): Promise<PageResponse<SchedulePlanSummary>> => {
    const query = new URLSearchParams();
    if (filters.cinemaId) query.append('cinemaId', filters.cinemaId.toString());
    if (filters.roomId) query.append('roomId', filters.roomId.toString());
    if (filters.status) query.append('status', filters.status);
    if (filters.page !== undefined) query.append('page', filters.page.toString());
    if (filters.size !== undefined) query.append('size', filters.size.toString());
    if (filters.sort) query.append('sort', filters.sort);

    const queryString = query.toString();
    const res = await httpClient.get<PageResponse<SchedulePlanSummary>>(
      `/admin/schedule-plans${queryString ? `?${queryString}` : ''}`
    );
    return res.data;
  },

  getById: async (id: number): Promise<SchedulePlan> => {
    const res = await httpClient.get<SchedulePlan>(`/admin/schedule-plans/${id}`);
    return res.data;
  },

  create: async (payload: SchedulePlanRequest): Promise<SchedulePlan> => {
    const res = await httpClient.post<SchedulePlan>('/admin/schedule-plans', payload);
    return res.data;
  },

  update: async (id: number, payload: SchedulePlanRequest): Promise<SchedulePlan> => {
    const res = await httpClient.put<SchedulePlan>(`/admin/schedule-plans/${id}`, payload);
    return res.data;
  },

  generate: async (
    id: number,
    payload: GenerateScheduleRequest
  ): Promise<GenerationSummary> => {
    const res = await httpClient.post<GenerationSummary>(
      `/admin/schedule-plans/${id}/generate`,
      payload
    );
    return res.data;
  },

  logs: async (
    id: number,
    filters: GenerationLogFilters = {}
  ): Promise<PageResponse<GenerationLog>> => {
    const query = new URLSearchParams();
    if (filters.from) query.append('from', filters.from);
    if (filters.to) query.append('to', filters.to);
    if (filters.page !== undefined) query.append('page', filters.page.toString());
    if (filters.size !== undefined) query.append('size', filters.size.toString());

    const queryString = query.toString();
    const res = await httpClient.get<PageResponse<GenerationLog>>(
      `/admin/schedule-plans/${id}/logs${queryString ? `?${queryString}` : ''}`
    );
    return res.data;
  },
};
