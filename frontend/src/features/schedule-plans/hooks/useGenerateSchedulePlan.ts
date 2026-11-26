import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSchedulePlansApi } from '../api/schedule-plans.api';
import type { GenerateScheduleRequest, GenerationSummary } from '../types/schedule-plan.types';

export const useGenerateSchedulePlan = (planId?: number) => {
  const queryClient = useQueryClient();

  return useMutation<GenerationSummary, Error, GenerateScheduleRequest>({
    mutationFn: (payload) => {
      if (!planId) throw new Error('Schedule plan ID is required for generation');
      return adminSchedulePlansApi.generate(planId, payload);
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['cinema-showtimes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'schedule-plans', 'logs'] });
    },
  });
};
