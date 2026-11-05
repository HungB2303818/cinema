import React from 'react';
import { X, Clock } from 'lucide-react';

export const SeatLegend: React.FC = () => {
  return (
    <div className="rounded-2xl bg-[#13151d] border border-[#242733] p-4 text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 items-center justify-center">
        {/* Available Standard */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#13151d] border border-[#2c3040] flex items-center justify-center text-[10px] text-zinc-300 font-medium">
            □
          </div>
          <span className="text-zinc-300">Ghế thường</span>
        </div>

        {/* Available VIP */}
        <div className="flex items-center gap-2">
          <div className="relative w-6 h-6 rounded-md bg-[#1c1724] border border-purple-500/60 flex items-center justify-center text-[10px] text-purple-300 font-medium">
            VIP
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-500" />
          </div>
          <span className="text-zinc-300">Ghế VIP</span>
        </div>

        {/* Selected */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#e6e2c1] border border-[#f0ecd2] flex items-center justify-center text-[10px] text-[#090a0f] font-bold">
            ✓
          </div>
          <span className="text-[#e6e2c1] font-medium">Đang chọn</span>
        </div>

        {/* Held */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-950/30 border border-amber-800/50 flex items-center justify-center text-amber-500/80">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-amber-500/90">Đang giữ chỗ</span>
        </div>

        {/* Booked */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#1a1c24] border border-[#252836] flex items-center justify-center text-zinc-600">
            <X className="w-3.5 h-3.5" />
          </div>
          <span className="text-zinc-500">Đã bán</span>
        </div>
      </div>
    </div>
  );
};
