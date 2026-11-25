import React from 'react';
import { X, Check } from 'lucide-react';
import { SEAT_SURFACE_STYLES } from '../utils/seat-styles';

export const SeatLegend: React.FC = () => {
  return (
    <div className="text-xs" aria-label="Chú giải trạng thái ghế">
      <div className="flex flex-wrap gap-x-5 gap-y-3 items-center justify-center lg:justify-start">
        {/* Available Standard */}
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] font-semibold ${SEAT_SURFACE_STYLES.standardStatic}`}
            aria-hidden="true"
          >
            A1
          </div>
          <span className="text-zinc-300">Ghế thường</span>
        </div>

        {/* Available VIP */}
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] font-semibold ${SEAT_SURFACE_STYLES.vipStatic}`}
            aria-hidden="true"
          >
            D1
          </div>
          <span className="text-zinc-300">Ghế VIP</span>
        </div>

        {/* Selected */}
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md border flex items-center justify-center font-bold ${SEAT_SURFACE_STYLES.selectedStatic}`}
            aria-hidden="true"
          >
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-zinc-200 font-medium">Đang chọn</span>
        </div>

        {/* Booked */}
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md border flex items-center justify-center ${SEAT_SURFACE_STYLES.booked}`}
            aria-hidden="true"
          >
            <X className="w-3.5 h-3.5" />
          </div>
          <span className="text-zinc-400">Đã bán</span>
        </div>
      </div>
    </div>
  );
};
