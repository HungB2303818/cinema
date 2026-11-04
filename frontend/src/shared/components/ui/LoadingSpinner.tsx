import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Đang tải dữ liệu...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-8 ${className}`}>
      <div className="w-10 h-10 border-4 border-[#e6e2c1]/20 border-t-[#e6e2c1] rounded-full animate-spin" />
      {message && <p className="text-sm text-zinc-400 font-medium">{message}</p>}
    </div>
  );
};
