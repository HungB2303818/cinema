import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { reportsApi } from '../api/reports.api';
import type {
  RevenueBreakdownResponse,
  RevenueFilters,
  RevenueGroupBy,
} from '../types/report.types';

export const revenueBreakdownKey = (
  userId: number | undefined,
  filters: RevenueFilters | null,
  groupBy: RevenueGroupBy | null,
  page: number,
  size: number,
  sort: string
) =>
  [
    'admin',
    'reports',
    'revenue',
    userId ?? 'anonymous',
    'breakdown',
    filters?.from ?? null,
    filters?.to ?? null,
    filters?.cinemaId ?? null,
    filters?.movieId ?? null,
    groupBy,
    page,
    size,
    sort,
  ] as const;

export const useRevenueBreakdown = (
  filters: RevenueFilters | null,
  groupBy: RevenueGroupBy | null,
  page: number,
  size: number,
  sort: string
) => {
  const { user } = useAuth();

  return useQuery<RevenueBreakdownResponse, Error>({
    queryKey: revenueBreakdownKey(user?.id, filters, groupBy, page, size, sort),
    queryFn: () =>
      reportsApi.breakdown(filters as RevenueFilters, groupBy as RevenueGroupBy, page, size, sort),
    enabled: user?.role === 'ADMIN' && filters !== null && groupBy !== null,
    staleTime: 30_000,
  });
};
