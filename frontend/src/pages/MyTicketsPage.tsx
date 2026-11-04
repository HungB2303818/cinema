import React from 'react';
import { Ticket, Film, Clock, AlertCircle } from 'lucide-react';
import { useMyTickets } from '@/features/tickets';
import { formatCurrency, formatDateTime } from '@/shared/utils/format';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

export const MyTicketsPage: React.FC = () => {
  const { data: bookings = [], isLoading: loading, error } = useMyTickets();

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Vé của tôi</h1>
        <p className="text-slate-400 text-sm mt-1">Danh sách vé xem phim và đơn đặt chỗ của bạn</p>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải vé của bạn..." />
      ) : error ? (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center text-slate-400">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p>{error instanceof Error ? error.message : 'Không thể tải danh sách vé.'}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
          <p className="text-slate-400 text-sm">Bạn chưa có đơn đặt vé nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                    MÃ: {b.bookingCode}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      b.status === 'CONFIRMED'
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
                        : b.status === 'PENDING'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-600/40'
                        : 'bg-red-600/20 text-red-400 border border-red-600/40'
                    }`}
                  >
                    {b.status === 'CONFIRMED'
                      ? 'ĐÃ XÁC NHẬN'
                      : b.status === 'PENDING'
                      ? 'CHỜ THANH TOÁN'
                      : 'ĐÃ HỦY'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-rose-500" />
                  <span>{b.movieTitle || 'Vé xem phim'}</span>
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  {b.startsAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDateTime(b.startsAt)}</span>
                    </div>
                  )}
                  {b.roomName && <div>Phòng: {b.roomName}</div>}
                  {b.seats && b.seats.length > 0 && (
                    <div>
                      Ghế:{' '}
                      <span className="text-white font-semibold">
                        {b.seats.map((s) => `${s.seatRow}${s.seatNumber}`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
                <div className="text-xs text-slate-400">Tổng thanh toán</div>
                <div className="text-xl font-black text-rose-400">{formatCurrency(b.totalAmount)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
