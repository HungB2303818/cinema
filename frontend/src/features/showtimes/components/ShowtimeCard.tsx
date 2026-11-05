import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Clock, Ban } from 'lucide-react';
import type { Showtime } from '../types/showtime.types';
import { formatTime, formatDateTime, formatCurrency, isPastCutoff } from '@/shared/utils/format';

interface ShowtimeCardProps {
  showtime: Showtime;
  now?: Date;
}

export const ShowtimeCard: React.FC<ShowtimeCardProps> = ({ showtime, now }) => {
  const isCutoff = isPastCutoff(showtime.startsAt, null, 10, now);
  const isScheduled = showtime.status === 'SCHEDULED';
  const canBook = isScheduled && !isCutoff;

  return (
    <div
      className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-lg ${
        canBook
          ? 'bg-[#13151d] border-[#242733] hover:border-[#e6e2c1]/60 shadow-black/30'
          : 'bg-[#101117] border-[#1e202a] opacity-75'
      }`}
    >
      <div className="space-y-3">
        {/* Cinema & Room header */}
        <div className="flex items-center justify-between text-xs text-zinc-400 gap-2">
          <span className="font-bold text-[#e6e2c1] flex items-center gap-1.5 truncate" title={showtime.cinemaName}>
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{showtime.cinemaName}</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#181a24] text-zinc-300 font-medium shrink-0">
            {showtime.roomName}
          </span>
        </div>

        {/* Time display */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tracking-tight">
              {formatTime(showtime.startsAt)}
            </span>
            <span className="text-xs text-zinc-500">
              ~ {formatTime(showtime.endsAt)}
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>{formatDateTime(showtime.startsAt)}</span>
          </div>
        </div>

        {/* Price display */}
        <div className="pt-2 border-t border-[#20232e] flex items-center justify-between text-xs">
          <span className="text-zinc-400">Giá vé tiêu chuẩn:</span>
          <span className="text-[#e6e2c1] font-bold text-sm">
            {formatCurrency(showtime.basePrice)}
          </span>
        </div>

        {/* Cutoff or cancelled notification banner */}
        {!isScheduled ? (
          <div className="text-[11px] text-zinc-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/60">
            <Ban className="w-3 h-3 text-zinc-400 shrink-0" />
            <span>Suất chiếu không khả dụng</span>
          </div>
        ) : isCutoff ? (
          <div className="text-[11px] text-amber-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Đã đóng đặt vé (trước giờ chiếu 10 phút)</span>
          </div>
        ) : null}
      </div>

      {/* Action button */}
      <div>
        {canBook ? (
          <Link
            to={`/showtimes/${showtime.id}/seats`}
            className="block w-full text-center py-2.5 px-4 text-xs font-bold rounded-full bg-[#e6e2c1] hover:bg-[#dad6b2] text-black shadow-md transition-all duration-200 active:scale-[0.98] border-none"
          >
            Chọn ghế
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full text-center py-2.5 px-4 text-xs font-semibold rounded-full bg-[#181a24] text-zinc-500 cursor-not-allowed border-none"
          >
            {isCutoff ? 'Đã quá giờ đặt' : 'Không khả dụng'}
          </button>
        )}
      </div>
    </div>
  );
};
