import React from 'react';
import type { SeatItem } from '@/features/showtimes';
import type { SeatType } from '@/features/cinemas';
import { formatCurrency } from '@/shared/utils';
import { X, Clock } from 'lucide-react';
import { SEAT_SURFACE_STYLES, type SeatVisualState } from '../utils/seat-styles';

interface SeatTileProps {
  label: string;
  seatType: SeatType;
  visualState: SeatVisualState;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  title?: string;
  className?: string;
}

export const SeatTile: React.FC<SeatTileProps> = ({
  label,
  seatType,
  visualState,
  onClick,
  disabled = false,
  ariaLabel,
  ariaPressed,
  title,
  className = '',
}) => {
  const isVip = seatType === 'VIP';
  const isBooked = visualState === 'BOOKED';
  const isHeld = visualState === 'HELD';
  const isSelected = visualState === 'SELECTED';
  const isMaintenance = visualState === 'MAINTENANCE';

  let stateStyle: string;
  if (isBooked) {
    stateStyle = SEAT_SURFACE_STYLES.booked;
  } else if (isHeld) {
    stateStyle = SEAT_SURFACE_STYLES.held;
  } else if (isMaintenance) {
    stateStyle = SEAT_SURFACE_STYLES.maintenance;
  } else if (isSelected) {
    stateStyle = SEAT_SURFACE_STYLES.selected;
  } else if (isVip) {
    stateStyle = SEAT_SURFACE_STYLES.vip;
  } else {
    stateStyle = SEAT_SURFACE_STYLES.standard;
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`relative flex items-center justify-center min-w-8 min-h-8 w-8 h-8 sm:w-9 sm:h-9 rounded-md border text-[11px] font-semibold transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6e2c1] ${stateStyle} ${className}`}
    >
      {isBooked ? (
        <X className="w-3 h-3 opacity-70" aria-hidden="true" />
      ) : isHeld ? (
        <Clock className="w-3 h-3 opacity-80" aria-hidden="true" />
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};

interface SeatBadgeProps {
  label: string;
  seatType: SeatType;
  className?: string;
}

export const SeatBadge: React.FC<SeatBadgeProps> = ({
  label,
  seatType,
  className = '',
}) => {
  const style =
    seatType === 'VIP'
      ? SEAT_SURFACE_STYLES.vipStatic
      : SEAT_SURFACE_STYLES.standardStatic;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-semibold text-xs ${style} ${className}`}
    >
      {label}
    </span>
  );
};

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

  const visualState: SeatVisualState = isBooked
    ? 'BOOKED'
    : isHeld
    ? 'HELD'
    : isSelected
    ? 'SELECTED'
    : 'AVAILABLE';

  return (
    <SeatTile
      label={seat.label}
      seatType={seat.seatType}
      visualState={visualState}
      onClick={handleClick}
      disabled={!isAvailable || disabled}
      ariaLabel={ariaLabel}
      ariaPressed={isSelected}
      title={`${seat.label} (${typeText}) - ${formatCurrency(seat.price)} - ${statusText}`}
    />
  );
};
