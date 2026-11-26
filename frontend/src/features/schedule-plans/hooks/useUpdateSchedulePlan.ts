import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSchedulePlansApi } from '../api/schedule-plans.api';
import type { SchedulePlan, SchedulePlanRequest } from '../types/schedule-plan.types';

export const useUpdateSchedulePlan = (planId?: number) => {
  const queryClient = useQueryClient();

  return useMutation<SchedulePlan, Error, SchedulePlanRequest>({
    mutationFn: (payload) => {
      if (!planId) throw new Error('Schedule plan ID is required for update');
      return adminSchedulePlansApi.update(planId, payload);
    },
    retry: false,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'schedule-plans'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'schedule-plans', 'detail', data.id],
      });
    },
  });
};
