import React, { useMemo } from 'react';
import type { SeatItem } from '@/features/showtimes';
import { Seat } from './Seat';
import { groupSeatsByRow } from '../utils/seat-utils';
import { Info } from 'lucide-react';

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
    <div className="rounded-2xl bg-[#10121a] border border-[#242733] p-4 sm:p-8 flex flex-col items-center">
      {/* Screen bar */}
      <div className="w-full max-w-xl flex flex-col items-center mb-8 sm:mb-12">
        <div className="relative w-full h-3 bg-gradient-to-r from-transparent via-[#e6e2c1]/40 to-transparent rounded-full blur-[1px]" />
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#e6e2c1] to-transparent rounded-full shadow-[0_4px_24px_rgba(230,226,193,0.35)]" />
        <span className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold mt-2">
          Màn hình / Screen
        </span>
      </div>

      {/* Seats container with horizontal scroll support */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="min-w-fit mx-auto flex flex-col items-center gap-2.5 sm:gap-3">
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

      {/* Note about list-based layout vs architectural layout */}
      <div className="mt-8 flex items-start gap-2 text-xs text-zinc-400 bg-[#13151d] px-4 py-2.5 rounded-xl border border-[#20232e] max-w-xl w-full">
        <Info className="w-4 h-4 text-[#e6e2c1] shrink-0 mt-0.5" />
        <p>
          Sơ đồ hiển thị vị trí ghế theo danh sách từ hệ thống rạp, không phải bản vẽ mặt bằng thực tế.
        </p>
      </div>
    </div>
  );
};
