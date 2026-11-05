import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  Film,
  Building2,
  Calendar,
  Clock,
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import { useBookingDetail, CancelBookingModal } from '@/features/bookings';
import { useAuth } from '@/features/auth';
import { LoadingSpinner, ErrorState, Button } from '@/shared/components/ui';
import { formatCurrency, formatVietnamDateTime } from '@/shared/utils';

export const BookingDetailPage: React.FC = () => {
  const { bookingId: rawBookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const { user } = useAuth();

  const isValidId = Boolean(
    rawBookingId && /^\d+$/.test(rawBookingId) && parseInt(rawBookingId, 10) > 0
  );
  const bookingId = isValidId ? parseInt(rawBookingId!, 10) : null;

  // Real-time timestamp
  const [now, setNow] = useState(() => Date.now());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);

  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useBookingDetail(bookingId, {
    enabled: isValidId && Boolean(user?.id),
    polling: true,
  });

  // Keep countdown updated
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const handleWakeup = () => {
      setNow(Date.now());
      refetch();
    };

    window.addEventListener('focus', handleWakeup);
    document.addEventListener('visibilitychange', handleWakeup);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleWakeup);
      document.removeEventListener('visibilitychange', handleWakeup);
    };
  }, [refetch]);

  const bookingExpiresAt = booking?.expiresAt;
  const remainingSeconds = useMemo(() => {
    if (!bookingExpiresAt) return 0;
    const expiresMs = new Date(bookingExpiresAt).getTime();
    return Math.max(0, Math.floor((expiresMs - now) / 1000));
  }, [bookingExpiresAt, now]);

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConfirmed =
    booking?.status === 'CONFIRMED' || booking?.effectiveStatus === 'CONFIRMED';
  const isExpired =
    booking?.effectiveStatus === 'EXPIRED' ||
    (booking?.status === 'PENDING' && remainingSeconds === 0);
  const isCancelled =
    booking?.status === 'CANCELLED' || booking?.effectiveStatus === 'CANCELLED';
  const isPending =
    (booking?.effectiveStatus === 'PENDING' || booking?.status === 'PENDING') &&
    remainingSeconds > 0 &&
    !isConfirmed &&
    !isCancelled;

  // Return path from location state or default to /my-tickets
  const backPath = (location.state as { from?: string } | null)?.from || '/my-tickets';

  // 1. Invalid ID
  if (!isValidId) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-6">
        <ErrorState
          title="Mã đơn đặt vé không hợp lệ"
          message="Đường dẫn không hợp lệ hoặc thiếu mã đơn. Vui lòng kiểm tra lại."
        />
        <Link to="/my-tickets">
          <Button variant="secondary" size="md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Quay lại danh sách vé</span>
          </Button>
        </Link>
      </div>
    );
  }

  // 2. Loading
  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner message="Đang tải chi tiết đơn đặt vé..." />
      </div>
    );
  }

  // 3. Error
  if (isError || !booking) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-6">
        <ErrorState
          title="Không tìm thấy đơn đặt vé"
          message={
            error instanceof Error
              ? error.message
              : 'Đơn đặt vé không tồn tại hoặc bạn không có quyền xem đơn này.'
          }
          onRetry={() => refetch()}
        />
        <div className="flex justify-center">
          <Link to="/my-tickets">
            <Button variant="secondary" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Quay lại danh sách vé</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20232e] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#e6e2c1] uppercase tracking-wider">
            <Link to={backPath} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Vé của tôi</span>
            </Link>
            <span>/</span>
            <span>Chi tiết đơn</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Mã đơn: <span className="text-[#e6e2c1] font-mono">{booking.bookingCode}</span>
          </h1>
          <p className="text-zinc-400 text-xs">
            Khởi tạo lúc: {formatVietnamDateTime(booking.createdAt)}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã thanh toán (CONFIRMED)</span>
            </span>
          ) : isCancelled ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-700/40 text-zinc-400 border border-zinc-700 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span>Đã hủy (CANCELLED)</span>
            </span>
          ) : isExpired ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Hết hạn giữ chỗ (EXPIRED)</span>
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
              <Clock className="w-4 h-4" />
              <span>Đang giữ chỗ (PENDING)</span>
            </span>
          )}
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

      {/* PENDING Countdown Banner */}
      {isPending && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#181a24] to-[#13151d] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Thời gian giữ chỗ còn lại</h2>
              <p className="text-xs text-zinc-400">
                Vui lòng thanh toán trước khi hết hạn để không bị hủy giữ chỗ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-3xl font-black font-mono tracking-wider text-amber-400 bg-[#090a0f] px-4 py-2 rounded-xl border border-amber-500/30 shadow-inner">
              {formatCountdown(remainingSeconds)}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              title="Làm mới trạng thái"
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border-none"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Showtime & Seats Snapshot */}
        <div className="md:col-span-8 space-y-6">
          {/* Showtime Card */}
          <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-4 shadow-lg">
            <h2 className="text-xs font-bold text-[#e6e2c1] uppercase tracking-wider flex items-center gap-1.5">
              <Film className="w-4 h-4" />
              <span>Thông tin suất chiếu</span>
            </h2>

            <div className="space-y-3">
              <h3 className="text-xl font-black text-white">{booking.movieTitle}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300 pt-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#e6e2c1] shrink-0" />
                  <span>
                    Phòng chiếu: <strong>{booking.roomName}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#e6e2c1] shrink-0" />
                  <span>
                    Suất: <strong>{formatVietnamDateTime(booking.startsAt)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seats Table */}
          <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#e6e2c1] uppercase tracking-wider">
                Danh sách ghế ({booking.seats.length} ghế)
              </h2>
              <span className="text-xs text-zinc-400">Đơn giá snapshot</span>
            </div>

            <div className="divide-y divide-[#20232e]">
              {booking.seats.map((seat) => (
                <div
                  key={seat.seatId}
                  className="py-3 flex items-center justify-between text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-8 rounded-lg bg-[#181a24] text-[#e6e2c1] font-bold flex items-center justify-center border border-[#242733]">
                      {seat.label}
                    </span>
                    <div>
                      <span className="font-semibold text-white">Ghế {seat.label}</span>
                      <span className="block text-[11px] text-zinc-400">
                        Loại: {seat.seatType}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-zinc-200">
                    {formatCurrency(seat.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Server Total & Actions */}
        <div className="md:col-span-4 space-y-6">
          <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-5 shadow-lg">
            <h2 className="text-xs font-bold text-[#e6e2c1] uppercase tracking-wider">
              Chi tiết giá trị đơn
            </h2>

            <div className="space-y-2 pt-1 border-t border-[#20232e]">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Số lượng ghế:</span>
                <span className="text-white font-semibold">{booking.seats.length}</span>
              </div>
              <div className="flex items-baseline justify-between pt-2 border-t border-[#20232e]">
                <span className="text-sm font-bold text-white">Tổng cộng:</span>
                <span className="text-2xl font-black text-[#e6e2c1] font-mono">
                  {formatCurrency(booking.totalAmount)}
                </span>
              </div>
            </div>

            {/* Actions based on status */}
            <div className="space-y-3 pt-3 border-t border-[#20232e]">
              {isPending && (
                <>
                  <Link to={`/bookings/${booking.bookingId}/checkout`} className="block w-full">
                    <Button variant="primary" size="md" className="w-full justify-center gap-2 font-bold py-3 shadow-lg">
                      <CreditCard className="w-4 h-4" />
                      <span>Tiếp tục thanh toán</span>
                    </Button>
                  </Link>

                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Hủy đơn giữ chỗ</span>
                  </Button>
                </>
              )}

              {isConfirmed && (
                <Link to={`/bookings/${booking.bookingId}/success`} className="block w-full">
                  <Button variant="primary" size="md" className="w-full justify-center gap-2 font-bold py-3 shadow-lg">
                    <Ticket className="w-4 h-4" />
                    <span>Xem vé điện tử</span>
                  </Button>
                </Link>
              )}

              {isExpired && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  Đơn đã hết thời hạn giữ chỗ và ghế đã được giải phóng.
                </div>
              )}

              {isCancelled && (
                <div className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs">
                  Đơn đặt vé này đã bị hủy.
                </div>
              )}

              <Link to="/my-tickets" className="block w-full pt-1">
                <Button variant="secondary" size="md" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Quay lại danh sách vé</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <CancelBookingModal
        isOpen={showCancelModal}
        booking={{
          bookingId: booking.bookingId,
          bookingCode: booking.bookingCode,
          movieTitle: booking.movieTitle,
        }}
        onClose={() => setShowCancelModal(false)}
        onSuccess={(res) => {
          setCancelFeedback(
            `Đã hủy đơn đặt vé thành công. Đã giải phóng ${res.releasedSeatCount} ghế.`
          );
          refetch();
        }}
      />
    </div>
  );
};
