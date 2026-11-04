import React from 'react';
import { Film } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Film,
  title = 'Không tìm thấy dữ liệu',
  description = 'Hiện tại chưa có nội dung nào phù hợp với yêu cầu của bạn.',
  action,
  className = '',
}) => {
  return (
    <div
      className={`py-16 px-6 text-center space-y-4 rounded-3xl bg-[#13151d]/50 border border-[#242733] max-w-lg mx-auto ${className}`}
    >
      <div className="inline-flex p-4 rounded-2xl bg-[#181a24] text-zinc-500 border border-[#262938]">
        <Icon className="w-10 h-10 stroke-1" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {description && (
          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
};
