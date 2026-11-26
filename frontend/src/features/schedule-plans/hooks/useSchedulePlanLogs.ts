import { useQuery } from '@tanstack/react-query';
import { adminSchedulePlansApi } from '../api/schedule-plans.api';
import type { PageResponse } from '@/shared/types/api.types';
import type { GenerationLog, GenerationLogFilters } from '../types/schedule-plan.types';

export const useSchedulePlanLogs = (planId?: number, filters: GenerationLogFilters = {}) => {
  return useQuery<PageResponse<GenerationLog>, Error>({
    queryKey: ['admin', 'schedule-plans', 'logs', planId, filters],
    queryFn: () => adminSchedulePlansApi.logs(planId!, filters),
    enabled: typeof planId === 'number' && planId > 0,
    staleTime: 15000,
  });
};
