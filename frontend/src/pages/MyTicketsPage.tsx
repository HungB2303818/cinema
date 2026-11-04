import React from 'react';
import { Ticket, Film, Clock } from 'lucide-react';
import { useMyTickets } from '@/features/tickets';
import { formatCurrency, formatDateTime } from '@/shared/utils/format';
import { LoadingSpinner, ErrorState, EmptyState, StatusBadge } from '@/shared/components/ui';

export const MyTicketsPage: React.FC = () => {
  const { data: bookings = [], isLoading: loading, error, refetch } = useMyTickets();

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-[#20232e] pb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white">Vé của tôi</h1>
        <p className="text-zinc-400 text-sm mt-1">Danh sách vé xem phim và đơn đặt chỗ của bạn</p>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải vé của bạn..." />
      ) : error ? (
        <ErrorState
          title="Không thể tải danh sách vé"
          message={error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi truy vấn dữ liệu vé của bạn.'}
          onRetry={() => refetch()}
        />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Bạn chưa có đơn đặt vé nào"
          description="Khám phá các bộ phim bom tấn đang chiếu và đặt vé ngay hôm nay để nhận nhiều ưu đãi hấp dẫn."
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-black/40 hover:border-zinc-700/80 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#181a24] border border-[#282b3a] text-zinc-300 font-bold">
                    MÃ: {b.bookingCode}
                  </span>
                  <StatusBadge status={b.status} size="sm" />
                </div>

                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#e6e2c1]" />
                  <span>{b.movieTitle || 'Vé xem phim'}</span>
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
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
                      <span className="text-white font-bold">
                        {b.seats.map((s) => `${s.seatRow}${s.seatNumber}`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 border-[#20232e]">
                <div className="text-xs text-zinc-400">Tổng thanh toán</div>
                <div className="text-2xl font-black text-[#e6e2c1]">{formatCurrency(b.totalAmount)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
