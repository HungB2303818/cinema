import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  action?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã có lỗi xảy ra',
  message = 'Không thể tải được dữ liệu vào lúc này. Vui lòng kiểm tra lại kết nối và thử lại.',
  onRetry,
  retryText = 'Thử lại',
  action,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`rounded-2xl bg-red-950/20 border border-red-800/40 p-8 text-center space-y-4 max-w-lg mx-auto ${className}`}
    >
      <div className="inline-flex p-3 rounded-2xl bg-red-500/10 text-red-400">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-red-200">{title}</h3>
        <p className="text-xs sm:text-sm text-red-300/90 leading-relaxed">{message}</p>
      </div>

      {(onRetry || action) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{retryText}</span>
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
};
