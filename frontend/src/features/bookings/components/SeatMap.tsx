import React, { useMemo } from 'react';
import type { SeatItem } from '@/features/showtimes';
import { Seat } from './Seat';
import { groupSeatsByRow } from '../utils/seat-utils';

interface SeatMapProps {
  seats: SeatItem[];
  selectedSeatIds: number[];
  onToggleSeat: (seat: SeatItem) => void;
  isCutoff?: boolean;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  onToggleSeat,
  isCutoff = false,
}) => {
  const rowGroups = useMemo(() => groupSeatsByRow(seats), [seats]);
  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const isMaxReached = selectedSeatIds.length >= 8;

  if (seats.length === 0) {
    return (
      <div className="rounded-2xl bg-[#13151d] border border-[#242733] p-12 text-center text-zinc-400">
        <p>Suất chiếu này hiện chưa có sơ đồ ghế khả dụng.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] bg-[#10121a] border border-[#242733] px-3 py-8 sm:px-8 sm:py-10 flex flex-col items-center overflow-hidden">
      {/* The screen is the focal point: its arc faces the audience below. */}
      <div className="w-full max-w-3xl flex flex-col items-center mb-10 sm:mb-14" aria-label="Màn hình / Screen">
        <svg viewBox="0 0 960 130" className="w-full h-auto overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="cinema-screen-arc" x1="0" x2="1">
              <stop offset="0%" stopColor="#e6e2c1" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#fff7d8" stopOpacity="1" />
              <stop offset="100%" stopColor="#e6e2c1" stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id="cinema-screen-light" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e6e2c1" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#e6e2c1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 24 94 Q 480 -22 936 94 L 800 130 L 160 130 Z" fill="url(#cinema-screen-light)" />
          <path d="M 24 94 Q 480 -22 936 94" fill="none" stroke="url(#cinema-screen-arc)" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <span className="text-xs tracking-[0.16em] text-[#c9c3a8] font-medium -mt-1">
          Màn hình / Screen
        </span>
      </div>

      {/* Seats container with horizontal scroll support */}
      <div className="w-full overflow-x-auto pb-4" aria-label="Sơ đồ ghế">
        <div className="min-w-fit mx-auto flex flex-col items-center gap-3 sm:gap-4">
          {rowGroups.map((group) => (
            <div key={group.rowLabel} className="flex items-center gap-2 sm:gap-3">
              {/* Row Label (Left) */}
              <span className="w-6 text-center text-xs font-bold text-zinc-500 select-none">
                {group.rowLabel !== 'Khác' ? group.rowLabel : ''}
              </span>

              {/* Seats in this row */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {group.seats.map((seat) => {
                  const isSelected = selectedSet.has(seat.seatId);
                  const disableNewSelection =
                    isCutoff || (!isSelected && isMaxReached);

                  return (
                    <Seat
                      key={seat.seatId}
                      seat={seat}
                      isSelected={isSelected}
                      onToggle={onToggleSeat}
                      disabled={disableNewSelection}
                    />
                  );
                })}
              </div>

              {/* Row Label (Right) */}
              <span className="w-6 text-center text-xs font-bold text-zinc-500 select-none">
                {group.rowLabel !== 'Khác' ? group.rowLabel : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-7 text-center text-[11px] leading-relaxed text-zinc-500">
        Vị trí ghế mang tính tham khảo theo danh sách của rạp.
      </p>
    </div>
  );
};
