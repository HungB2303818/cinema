import { useQuery } from '@tanstack/react-query';
import { adminSchedulePlansApi } from '../api/schedule-plans.api';
import type { PageResponse } from '@/shared/types/api.types';
import type { SchedulePlanFilters, SchedulePlanSummary } from '../types/schedule-plan.types';

export const useAdminSchedulePlans = (filters: SchedulePlanFilters = {}) => {
  return useQuery<PageResponse<SchedulePlanSummary>, Error>({
    queryKey: ['admin', 'schedule-plans', filters],
    queryFn: () => adminSchedulePlansApi.list(filters),
    staleTime: 30000,
  });
};
