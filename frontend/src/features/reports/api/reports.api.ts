import axios from 'axios';
import { ApiErrorResponse, httpClient } from '@/shared/api/http-client';
import type { FieldErrorItem } from '@/shared/types/api.types';
import type {
  RevenueBreakdownResponse,
  RevenueDashboardResponse,
  RevenueExportFile,
  RevenueExportGroupBy,
  RevenueFilters,
  RevenueGroupBy,
  RevenueTimeGroup,
} from '../types/report.types';

const BASE_PATH = '/admin/reports/revenue';

function filterParams(filters: RevenueFilters): URLSearchParams {
  const query = new URLSearchParams();
  query.set('from', filters.from);
  query.set('to', filters.to);
  if (filters.cinemaId !== null) query.set('cinemaId', String(filters.cinemaId));
  if (filters.movieId !== null) query.set('movieId', String(filters.movieId));
  return query;
}

function filenameFromDisposition(header: unknown): string {
  if (typeof header !== 'string') return 'revenue.csv';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return encoded[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : 'revenue.csv';
}

interface ErrorEnvelope {
  message?: string;
  code?: string;
  timestamp?: string;
  path?: string;
  fieldErrors?: FieldErrorItem[];
  details?: Record<string, string>;
}

async function normalizeBlobError(error: unknown): Promise<never> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    const text = await error.response.data.text();
    let envelope: ErrorEnvelope | null = null;
    try {
      envelope = JSON.parse(text) as ErrorEnvelope;
    } catch {
      envelope = null;
    }
    if (envelope) {
      throw new ApiErrorResponse(
        envelope.message || 'Không thể xuất báo cáo.',
        envelope.code || 'API_ERROR',
        error.response.status,
        envelope.fieldErrors,
        envelope.timestamp,
        envelope.path,
        envelope.details
      );
    }
  }
  throw error;
}

export const reportsApi = {
  dashboard: async (
    filters: RevenueFilters,
    timeGroup: RevenueTimeGroup
  ): Promise<RevenueDashboardResponse> => {
    const query = filterParams(filters);
    query.set('timeGroup', timeGroup);
    const res = await httpClient.get<RevenueDashboardResponse>(
      `${BASE_PATH}/dashboard?${query.toString()}`
    );
    return res.data;
  },

  breakdown: async (
    filters: RevenueFilters,
    groupBy: RevenueGroupBy,
    page: number,
    size: number,
    sort: string
  ): Promise<RevenueBreakdownResponse> => {
    const query = filterParams(filters);
    query.set('groupBy', groupBy);
    query.set('page', String(page));
    query.set('size', String(size));
    query.set('sort', sort);
    const res = await httpClient.get<RevenueBreakdownResponse>(
      `${BASE_PATH}/breakdown?${query.toString()}`
    );
    return res.data;
  },

  exportCsv: async (
    filters: RevenueFilters,
    groupBy: RevenueExportGroupBy
  ): Promise<RevenueExportFile> => {
    const query = filterParams(filters);
    query.set('groupBy', groupBy);
    try {
      const res = await httpClient.get<Blob>(`${BASE_PATH}/export?${query.toString()}`, {
        responseType: 'blob',
      });
      return {
        blob: res.data,
        filename: filenameFromDisposition(res.headers['content-disposition']),
      };
    } catch (error) {
      return normalizeBlobError(error);
    }
  },
};
