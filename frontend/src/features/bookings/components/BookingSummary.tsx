import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { SeatItem } from '@/features/showtimes';
import { formatCurrency, formatVietnamDateTime } from '@/shared/utils';
import { useAuth } from '@/features/auth';
import {
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  LogIn,
} from 'lucide-react';

interface BookingSummaryProps {
  selectedSeats: SeatItem[];
  showtimeId?: number | null;
  movieTitle?: string;
  cinemaName?: string;
  roomName?: string;
  startsAt?: string;
  isCutoff?: boolean;
  onContinue: () => void;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedSeats,
  showtimeId,
  movieTitle,
  cinemaName,
  roomName,
  startsAt,
  isCutoff = false,
  onContinue,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const count = selectedSeats.length;

  const isStaffOrAdmin =
    isAuthenticated && (user?.role === 'STAFF' || user?.role === 'ADMIN');

  const handleLoginRedirect = () => {
    navigate('/login', {
      state: { from: location.pathname + location.search },
    });
  };

  return (
    <aside
      aria-label="Thông tin suất chiếu và đặt vé"
      className="rounded-xl bg-[#171922] border border-[#323440] p-6 sm:p-7 space-y-6"
    >
      {/* Showtime & Movie Info */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white leading-snug">
          {movieTitle || 'Suất chiếu xem phim'}
        </h2>

        <dl className="space-y-2.5 text-sm">
          {cinemaName && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-zinc-400 shrink-0">Rạp chiếu</dt>
              <dd className="font-medium text-zinc-100 text-right">{cinemaName}</dd>
            </div>
          )}

          {roomName && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-zinc-400 shrink-0">Phòng chiếu</dt>
              <dd className="text-zinc-200 text-right">{roomName}</dd>
            </div>
          )}

          {startsAt && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-zinc-400 shrink-0">Giờ chiếu</dt>
              <dd className="text-zinc-200 text-right">
                <time dateTime={startsAt}>{formatVietnamDateTime(startsAt)}</time>
              </dd>
            </div>
          )}

          {!cinemaName && !roomName && showtimeId && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-zinc-400 shrink-0">Suất chiếu</dt>
              <dd className="text-zinc-300 text-right">Mã suất #{showtimeId}</dd>
            </div>
          )}
        </dl>

        {isCutoff && (
          <p className="text-xs font-medium text-rose-300">Đã ngừng nhận đặt vé</p>
        )}
      </div>

      {/* Total Amount */}
      <div className="pt-5 border-t border-[#262936] space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-300">Tạm tính</span>
          <span className="text-2xl font-black text-[#e6e2c1]">
            {formatCurrency(totalAmount)}
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Ghế chỉ được giữ sau khi bạn xác nhận đặt vé.
        </p>
      </div>

      {/* Warnings & Action Button */}
      <div className="space-y-3 pt-1">
        {isCutoff && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
            <span>Suất chiếu đã ngừng nhận đặt vé trực tuyến.</span>
          </div>
        )}

        {isStaffOrAdmin && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
            <span>
              Tài khoản {user?.role} không thể đặt vé khách hàng. Vui lòng sử dụng tài khoản khách hàng.
            </span>
          </div>
        )}

        {!isAuthenticated ? (
          <button
            type="button"
            onClick={handleLoginRedirect}
            disabled={count === 0 || isCutoff}
            className="w-full py-3.5 px-5 rounded-lg font-bold text-sm bg-[#e6e2c1] text-[#090a0f] hover:bg-[#d8d4b3] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#e6e2c1]/10 cursor-pointer"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>Đăng nhập để tiếp tục</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            disabled={count === 0 || isCutoff || isStaffOrAdmin}
            className="w-full py-3.5 px-5 rounded-lg font-bold text-sm bg-[#e6e2c1] text-[#090a0f] hover:bg-[#d8d4b3] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#e6e2c1]/10 cursor-pointer"
          >
            <span>Tiếp tục đặt vé</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
};
