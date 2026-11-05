import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import type { UserRole } from '@/features/auth';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { ErrorState } from '@/shared/components/ui/ErrorState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner message="Đang kiểm tra đăng nhập..." className="min-h-[50vh]" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-4">
        <ErrorState
          title="Không có quyền truy cập"
          message={`Trang này yêu cầu quyền ${requiredRole}. Tài khoản hiện tại (${user?.role}) không có quyền truy cập.`}
        />
      </div>
    );
  }

  return <>{children}</>;
};
