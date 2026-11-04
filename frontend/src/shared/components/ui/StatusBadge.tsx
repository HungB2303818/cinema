import React from 'react';

export type StatusType =
  | 'SHOWING'
  | 'UPCOMING'
  | 'ENDED'
  | 'CONFIRMED'
  | 'PENDING'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'AVAILABLE'
  | 'HELD'
  | 'BOOKED'
  | 'SELECTED'
  | 'ACTIVE'
  | 'LOCKED'
  | 'MAINTENANCE'
  | 'CUSTOMER'
  | 'STAFF'
  | 'ADMIN'
  | string;

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfigMap: Record<string, { label: string; className: string }> = {
  // Movie statuses
  SHOWING: {
    label: 'Đang chiếu',
    className: 'bg-[#e6e2c1] text-black font-bold shadow-sm border-none',
  },
  UPCOMING: {
    label: 'Sắp chiếu',
    className: 'bg-zinc-800/90 text-zinc-200 border-none',
  },
  ENDED: {
    label: 'Đã kết thúc',
    className: 'bg-zinc-900 text-zinc-500 border-none',
  },

  // Booking statuses
  CONFIRMED: {
    label: 'ĐÃ XÁC NHẬN',
    className: 'bg-[#e6e2c1]/20 text-[#e6e2c1] font-bold border-none',
  },
  PENDING: {
    label: 'CHỜ THANH TOÁN',
    className: 'bg-amber-500/20 text-amber-300 font-bold border-none',
  },
  CANCELLED: {
    label: 'ĐÃ HỦY',
    className: 'bg-red-500/20 text-red-300 font-bold border-none',
  },
  EXPIRED: {
    label: 'HẾT HẠN',
    className: 'bg-zinc-800 text-zinc-400 font-medium border-none',
  },

  // Seat statuses
  AVAILABLE: {
    label: 'Ghế trống',
    className: 'bg-[#1a1d26] text-zinc-300 border-none',
  },
  HELD: {
    label: 'Đang giữ chỗ',
    className: 'bg-amber-500/20 text-amber-300 border-none',
  },
  BOOKED: {
    label: 'Đã đặt',
    className: 'bg-zinc-900 text-zinc-500 border-none',
  },
  SELECTED: {
    label: 'Đang chọn',
    className: 'bg-[#e6e2c1] text-black font-bold shadow-md border-none',
  },

  // Room / General statuses
  ACTIVE: {
    label: 'Hoạt động',
    className: 'bg-emerald-500/20 text-emerald-400 border-none',
  },
  LOCKED: {
    label: 'Đã khóa',
    className: 'bg-red-500/20 text-red-400 border-none',
  },
  MAINTENANCE: {
    label: 'Bảo trì',
    className: 'bg-amber-500/20 text-amber-300 border-none',
  },

  // User roles
  CUSTOMER: {
    label: 'Khách hàng',
    className: 'bg-zinc-800 text-zinc-300 border-none',
  },
  STAFF: {
    label: 'Nhân viên',
    className: 'bg-sky-500/20 text-sky-400 font-semibold border-none',
  },
  ADMIN: {
    label: 'Quản trị viên',
    className: 'bg-[#e6e2c1]/20 text-[#e6e2c1] font-bold border-none',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
  className = '',
}) => {
  const upperStatus = status.toUpperCase();
  const config = statusConfigMap[upperStatus] || {
    label: status,
    className: 'bg-zinc-800 text-zinc-300 border-none',
  };

  const displayText = label || config.label;

  const sizeClasses = {
    sm: 'text-xs px-3 py-1 rounded-full',
    md: 'text-sm px-4 py-1.5 rounded-full',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium transition-colors ${sizeClasses[size]} ${config.className} ${className}`}
    >
      {displayText}
    </span>
  );
};
