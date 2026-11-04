import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '@/features/auth';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  );
};
