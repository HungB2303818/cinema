import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSchedulePlansApi } from '../api/schedule-plans.api';
import type { SchedulePlan, SchedulePlanRequest } from '../types/schedule-plan.types';

export const useCreateSchedulePlan = () => {
  const queryClient = useQueryClient();

  return useMutation<SchedulePlan, Error, SchedulePlanRequest>({
    mutationFn: (payload) => adminSchedulePlansApi.create(payload),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'schedule-plans'] });
    },
  });
};
