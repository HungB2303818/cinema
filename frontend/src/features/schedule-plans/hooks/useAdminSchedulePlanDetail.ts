import { useQuery } from '@tanstack/react-query';
import { adminSchedulePlansApi } from '../api/schedule-plans.api';
import type { SchedulePlan } from '../types/schedule-plan.types';

export const useAdminSchedulePlanDetail = (id?: number) => {
  return useQuery<SchedulePlan, Error>({
    queryKey: ['admin', 'schedule-plans', 'detail', id],
    queryFn: () => adminSchedulePlansApi.getById(id!),
    enabled: typeof id === 'number' && id > 0,
    staleTime: 30000,
  });
};
