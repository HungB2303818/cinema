import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { reportsApi } from '../api/reports.api';
import type { RevenueDashboardResponse, RevenueFilters, RevenueTimeGroup } from '../types/report.types';

export const revenueDashboardKey = (
  userId: number | undefined,
  filters: RevenueFilters | null,
  timeGroup: RevenueTimeGroup
) =>
  [
    'admin',
    'reports',
    'revenue',
    userId ?? 'anonymous',
    'dashboard',
    filters?.from ?? null,
    filters?.to ?? null,
    filters?.cinemaId ?? null,
    filters?.movieId ?? null,
    timeGroup,
  ] as const;

export const useRevenueDashboard = (
  filters: RevenueFilters | null,
  timeGroup: RevenueTimeGroup
) => {
  const { user } = useAuth();

  return useQuery<RevenueDashboardResponse, Error>({
    queryKey: revenueDashboardKey(user?.id, filters, timeGroup),
    queryFn: () => reportsApi.dashboard(filters as RevenueFilters, timeGroup),
    enabled: user?.role === 'ADMIN' && filters !== null,
    staleTime: 30_000,
  });
};
