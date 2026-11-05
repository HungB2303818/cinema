import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Ticket,
  Film,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  useBookingHistory,
  CancelBookingModal,
  type BookingSummaryItem,
  type BookingCancelResponse,
} from '@/features/bookings';
import { formatCurrency, formatVietnamDateTime } from '@/shared/utils';
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Button,
} from '@/shared/components/ui';

const ALLOWED_SORTS = [
  'createdAt,desc',
  'createdAt,asc',
  'startsAt,desc',
  'startsAt,asc',
  'status,asc',
  'status,desc',
];

export const MyTicketsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL query parameters
  const rawPage = searchParams.get('page');
  const rawSize = searchParams.get('size');
  const rawSort = searchParams.get('sort');

  const page =
    rawPage && /^\d+$/.test(rawPage) ? Math.max(0, parseInt(rawPage, 10)) : 0;
  const size =
    rawSize && /^\d+$/.test(rawSize) && parseInt(rawSize, 10) > 0
      ? Math.min(100, Math.max(1, parseInt(rawSize, 10)))
      : 20;
  const sort =
    rawSort && ALLOWED_SORTS.includes(rawSort) ? rawSort : 'createdAt,desc';

  // Modal and feedback states
  const [cancelTarget, setCancelTarget] = useState<BookingSummaryItem | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  // Fetch real booking history from GET /api/bookings/me
  const {
    data: pageData,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookingHistory({ page, size, sort });

  const bookings = pageData?.content || [];
  const totalPages = pageData?.totalPages || 0;
  const totalElements = pageData?.totalElements || 0;

  // Change page
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  // Change size
  const handleSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '0'); // Reset to page 0
    params.set('size', String(newSize));
    setSearchParams(params);
  };

  // Change sort
  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '0'); // Reset to page 0
    params.set('sort', newSort);
    setSearchParams(params);
  };

  const renderStatusBadge = (item: BookingSummaryItem) => {
    const status = item.effectiveStatus || item.status;
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã thanh toán</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Đang giữ chỗ</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-700/40 text-zinc-400 border border-zinc-700">
            <XCircle className="w-3.5 h-3.5" />
            <span>Đã hủy</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Hết hạn</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20232e] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Vé của tôi</h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Lịch sử đơn đặt vé, thanh toán và vé đã nhận
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <label htmlFor="history-sort" className="text-xs text-zinc-400 shrink-0">
            Sắp xếp:
          </label>
          <select
            id="history-sort"
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="bg-[#13151d] text-zinc-200 text-xs rounded-xl border border-[#242733] px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="createdAt,desc">Mới nhất trước</option>
            <option value="createdAt,asc">Cũ nhất trước</option>
            <option value="startsAt,asc">Suất chiếu sớm nhất</option>
            <option value="startsAt,desc">Suất chiếu muộn nhất</option>
            <option value="status,asc">Theo trạng thái</option>
          </select>
        </div>
      </div>

      {/* Cancel Feedback Banner */}
      {cancelFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300 text-xs sm:text-sm">
          <span>{cancelFeedback}</span>
          <button
            type="button"
            onClick={() => setCancelFeedback(null)}
            className="text-xs text-emerald-400 hover:text-white px-2 py-1 cursor-pointer border-none bg-transparent"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Body */}
      {isLoading ? (
        <div className="py-24">
          <LoadingSpinner message="Đang tải lịch sử đặt vé..." />
        </div>
      ) : isError ? (
        <ErrorState
          title="Không thể tải lịch sử đơn đặt vé"
          message={
            error instanceof Error
              ? error.message
              : 'Đã có lỗi xảy ra khi truy vấn dữ liệu từ máy chủ.'
          }
          onRetry={() => refetch()}
        />
      ) : totalElements === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Bạn chưa có đơn đặt vé nào"
          description="Khám phá các bộ phim bom tấn đang chiếu và đặt vé ngay hôm nay để nhận nhiều ưu đãi hấp dẫn."
        />
      ) : page >= totalPages && totalPages > 0 ? (
        <div className="py-16 text-center space-y-4 bg-[#13151d] border border-[#242733] rounded-3xl p-8">
          <p className="text-zinc-300 text-sm">
            Trang yêu cầu (Trang {page + 1}) vượt quá tổng số trang hiện có (
            {totalPages} trang).
          </p>
          <Button variant="primary" size="md" onClick={() => handlePageChange(0)}>
            <span>Quay lại trang đầu tiên</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Booking Items List */}
          <div className="space-y-4">
            {bookings.map((b) => {
              const status = b.effectiveStatus || b.status;
              const isConfirmed = status === 'CONFIRMED';
              const isPending = status === 'PENDING';

              return (
                <div
                  key={b.bookingId}
                  className="bg-[#13151d] border border-[#242733] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-black/40 hover:border-zinc-700/80 transition-all"
                >
                  {/* Left Column: Code, Movie, Showtime, Timestamp */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#181a24] border border-[#282b3a] text-zinc-300 font-bold">
                        MÃ: {b.bookingCode}
                      </span>
                      {renderStatusBadge(b)}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-[#e6e2c1] shrink-0" />
                      <span>{b.movieTitle || 'Đơn vé xem phim'}</span>
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-1">
                      {b.startsAt && (
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Clock className="w-3.5 h-3.5 text-[#e6e2c1]" />
                          <span>Suất: <strong>{formatVietnamDateTime(b.startsAt)}</strong></span>
                        </div>
                      )}
                      {b.createdAt && (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Đặt lúc: {formatVietnamDateTime(b.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Total Amount & Action Buttons */}
                  <div className="flex flex-col items-start md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 border-[#20232e] gap-3 shrink-0">
                    <div className="text-left md:text-right">
                      <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                        {isConfirmed ? 'Tổng thanh toán' : 'Tổng giá trị đơn'}
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#e6e2c1] font-mono">
                        {formatCurrency(b.totalAmount)}
                      </div>
                    </div>

                    {/* Action buttons based on status */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {isPending && (
                        <>
                          <Link to={`/bookings/${b.bookingId}/checkout`}>
                            <Button variant="primary" size="sm" className="gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Tiếp tục thanh toán</span>
                            </Button>
                          </Link>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setCancelTarget(b)}
                            className="gap-1"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Hủy</span>
                          </Button>
                        </>
                      )}

                      {isConfirmed && (
                        <Link to={`/bookings/${b.bookingId}/success`}>
                          <Button variant="primary" size="sm" className="gap-1.5">
                            <Ticket className="w-3.5 h-3.5" />
                            <span>Xem vé</span>
                          </Button>
                        </Link>
                      )}

                      <Link
                        to={`/bookings/${b.bookingId}`}
                        state={{ from: `/my-tickets?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}` }}
                      >
                        <Button variant="secondary" size="sm" className="gap-1">
                          <span>Chi tiết</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#20232e]">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>
                  Tổng số: <strong className="text-white">{totalElements}</strong> đơn
                </span>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span>Hiển thị:</span>
                  <select
                    value={size}
                    onChange={(e) => handleSizeChange(parseInt(e.target.value, 10))}
                    className="bg-[#13151d] text-zinc-200 rounded-lg border border-[#242733] px-2 py-1 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="text-xs font-medium text-zinc-300 px-3">
                  Trang {page + 1} / {totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                  aria-label="Trang tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Modal */}
      <CancelBookingModal
        isOpen={Boolean(cancelTarget)}
        booking={
          cancelTarget
            ? {
                bookingId: cancelTarget.bookingId,
                bookingCode: cancelTarget.bookingCode,
                movieTitle: cancelTarget.movieTitle,
              }
            : null
        }
        onClose={() => setCancelTarget(null)}
        onSuccess={(res: BookingCancelResponse) => {
          setCancelFeedback(
            `Đã hủy đơn giữ chỗ ${cancelTarget?.bookingCode} thành công. Đã giải phóng ${res.releasedSeatCount} ghế.`
          );
          refetch();
        }}
      />
    </div>
  );
};
