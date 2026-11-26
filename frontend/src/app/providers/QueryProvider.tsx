import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiErrorResponse } from '@/shared/api/http-client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiErrorResponse && error.status && [401, 403, 404].includes(error.status)) {
          return false;
        }
        return failureCount < 1;
      },
      staleTime: 60_000,
    },
  },
});

export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
