import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasRole, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Đang kiểm tra quyền quản trị..." className="min-h-[50vh]" />;
  }

  if (!hasRole('ADMIN')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
