import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { SeatItem } from '@/features/showtimes';
import { formatCurrency } from '@/shared/utils';
import { useAuth } from '@/features/auth';
import { AlertCircle, X, ShieldAlert, ArrowRight, LogIn } from 'lucide-react';

interface BookingSummaryProps {
  selectedSeats: SeatItem[];
  onRemoveSeat: (seatId: number) => void;
  isCutoff?: boolean;
  onContinue: () => void;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedSeats,
  onRemoveSeat,
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
    <div className="rounded-[28px] bg-[#171922] border border-[#323440] p-5 sm:p-6 space-y-5">
      {/* Selected Seats List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Ghế đã chọn ({count}/8)</span>
        </div>

        {count === 0 ? (
          <p className="text-sm text-zinc-400 py-5 text-center border border-dashed border-[#343744] rounded-xl">
            Chọn ghế trên sơ đồ để tiếp tục.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {selectedSeats.map((seat) => (
              <div
                key={seat.seatId}
                className="flex items-center justify-between p-2 rounded-xl bg-[#181a24] border border-[#242733] text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#e6e2c1] px-2 py-0.5 rounded bg-[#10121a]">
                    {seat.label}
                  </span>
                   <span className="text-zinc-400">{seat.seatType === 'VIP' ? 'VIP' : 'Thường'}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">
                    {formatCurrency(seat.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveSeat(seat.seatId)}
                    className="p-1 text-zinc-400 hover:text-rose-400 rounded transition-colors"
                    title="Bỏ chọn ghế này"
                    aria-label={`Bỏ chọn ghế ${seat.label}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Amount */}
      <div className="pt-4 border-t border-[#20232e] space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-300">Tạm tính</span>
          <span className="text-xl font-black text-[#e6e2c1]">
            {formatCurrency(totalAmount)}
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Ghế chỉ được giữ sau khi bạn xác nhận đặt vé.
        </p>
      </div>

      {/* Warnings & Action Button */}
      <div className="space-y-3 pt-2">
        {isCutoff && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>Suất chiếu đã ngừng nhận đặt vé trực tuyến.</span>
          </div>
        )}

        {isStaffOrAdmin && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
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
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#e6e2c1] text-[#090a0f] hover:bg-[#d8d4b3] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#e6e2c1]/10"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập để tiếp tục</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onContinue}
            disabled={count === 0 || isCutoff || isStaffOrAdmin}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-[#e6e2c1] text-[#090a0f] hover:bg-[#d8d4b3] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#e6e2c1]/10"
          >
            <span>Tiếp tục đặt vé</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
