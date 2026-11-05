import React from 'react';
import type { SeatItem } from '@/features/showtimes';
import { formatCurrency } from '@/shared/utils';
import { X, Clock } from 'lucide-react';

interface SeatProps {
  seat: SeatItem;
  isSelected: boolean;
  onToggle: (seat: SeatItem) => void;
  disabled?: boolean;
}

export const Seat: React.FC<SeatProps> = ({
  seat,
  isSelected,
  onToggle,
  disabled = false,
}) => {
  const isAvailable = seat.status === 'AVAILABLE';
  const isVip = seat.seatType === 'VIP';
  const isBooked = seat.status === 'BOOKED';
  const isHeld = seat.status === 'HELD';

  const handleClick = () => {
    if (!isAvailable || disabled) return;
    onToggle(seat);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Build semantic accessible label
  const typeText = isVip ? 'VIP' : 'Tiêu chuẩn';
  const statusText = isBooked
    ? 'Đã bán'
    : isHeld
    ? 'Đang giữ chỗ'
    : isSelected
    ? 'Đang chọn'
    : 'Trống';

  const ariaLabel = `Ghế ${seat.label}, loại ${typeText}, ${formatCurrency(
    seat.price
  )}, ${statusText}`;

  // Styling based on state and type
  let buttonStyle = '';
  if (isBooked) {
    buttonStyle =
      'bg-[#1a1c24] border-[#252836] text-zinc-600 cursor-not-allowed opacity-60';
  } else if (isHeld) {
    buttonStyle =
      'bg-amber-950/30 border-amber-800/50 text-amber-500/70 cursor-not-allowed';
  } else if (isSelected) {
    buttonStyle =
      'bg-[#e6e2c1] border-[#f0ecd2] text-[#090a0f] font-bold shadow-lg shadow-[#e6e2c1]/20 scale-105';
  } else if (isVip) {
    buttonStyle =
      'bg-[#1c1724] border-purple-500/50 text-purple-300 hover:border-purple-400 hover:bg-[#251e33]';
  } else {
    buttonStyle =
      'bg-[#13151d] border-[#2c3040] text-zinc-300 hover:border-[#e6e2c1]/70 hover:bg-[#1a1c26]';
  }

  return (
    <button
      type="button"
      role="button"
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      disabled={!isAvailable || disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={`${seat.label} (${typeText}) - ${formatCurrency(seat.price)} - ${statusText}`}
      className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg border text-xs transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#e6e2c1] ${buttonStyle}`}
    >
      {isBooked ? (
        <X className="w-3.5 h-3.5 opacity-60" />
      ) : isHeld ? (
        <Clock className="w-3.5 h-3.5 opacity-70" />
      ) : isSelected ? (
        <span className="flex items-center justify-center font-bold">
          {seat.label}
        </span>
      ) : (
        <span>{seat.label}</span>
      )}

      {/* Tiny indicator for VIP seats when available and not selected */}
      {isVip && isAvailable && !isSelected && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-[#090a0f]" />
      )}
    </button>
  );
};
