import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  Film,
  Building2,
  Calendar,
  Ticket,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useBookingDetail } from '@/features/bookings';
import { useBookingTickets } from '@/features/tickets';
import { useAuth } from '@/features/auth';
import { LoadingSpinner, ErrorState, Button } from '@/shared/components/ui';
import { formatCurrency, formatVietnamDateTime } from '@/shared/utils';

export const BookingSuccessPage: React.FC = () => {
  const { bookingId: rawBookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();

  const isValidId = Boolean(
    rawBookingId && /^\d+$/.test(rawBookingId) && parseInt(rawBookingId, 10) > 0
  );
  const bookingId = isValidId ? parseInt(rawBookingId!, 10) : null;

  // Copy feedback state: map of ticketCode -> boolean
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // 1. Fetch authoritative booking detail from server
  const {
    data: booking,
    isLoading: isBookingLoading,
    isError: isBookingError,
    error: bookingError,
    refetch: refetchBooking,
  } = useBookingDetail(bookingId, {
    enabled: isValidId && Boolean(user?.id),
    polling: false,
  });

  const isConfirmed =
    booking?.status === 'CONFIRMED' || booking?.effectiveStatus === 'CONFIRMED';

  // 2. ONLY fetch tickets if the booking is verified as CONFIRMED
  const {
    data: tickets,
    isLoading: isTicketsLoading,
    isError: isTicketsError,
    error: ticketsError,
    refetch: refetchTickets,
    isFetching: isTicketsFetching,
  } = useBookingTickets(bookingId, {
    enabled: isConfirmed,
  });

  const handleCopy = async (code: string) => {
    try {
      setCopyError(null);
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for environments without clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      setCopyError('Không thể tự động sao chép. Vui lòng chọn và sao chép thủ công.');
      setTimeout(() => setCopyError(null), 4000);
    }
  };

  // 1. Invalid ID
  if (!isValidId) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-6">
        <ErrorState
          title="Mã đơn đặt vé không hợp lệ"
          message="Đường dẫn không hợp lệ hoặc thiếu mã đơn đặt vé."
        />
        <Link to="/movies">
          <Button variant="secondary" size="md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Chọn phim khác</span>
          </Button>
        </Link>
      </div>
    );
  }

  // 2. Loading booking
  if (isBookingLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner message="Đang xác minh trạng thái đặt vé..." />
      </div>
    );
  }

  // 3. Error or Not Found
  if (isBookingError || !booking) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-6">
        <ErrorState
          title="Không thể tìm thấy thông tin vé"
          message={
            bookingError instanceof Error
              ? bookingError.message
              : 'Đơn đặt vé không tồn tại hoặc bạn không có quyền xem thông tin vé này.'
          }
          onRetry={() => refetchBooking()}
        />
        <div className="flex justify-center">
          <Link to="/movies">
            <Button variant="secondary" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Chọn phim khác</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Booking is still PENDING -> Not yet paid
  if (booking.status === 'PENDING') {
    return (
      <div className="py-16 max-w-lg mx-auto px-4 text-center space-y-6">
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white">Đơn đặt vé chưa hoàn tất thanh toán</h1>
          <p className="text-xs sm:text-sm text-amber-300/80 leading-relaxed">
            Đơn vé <strong className="text-white">{booking.bookingCode}</strong> hiện đang ở trạng
            thái giữ chỗ. Bạn cần hoàn tất thanh toán trước khi thời hạn giữ ghế kết thúc để nhận vé.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={`/bookings/${booking.bookingId}/checkout`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full">
                <span>Tiếp tục thanh toán</span>
              </Button>
            </Link>
            <Link to="/movies" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full">
                <span>Chọn phim khác</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 5. Booking is EXPIRED or CANCELLED or FAILED -> Not confirmed
  if (!isConfirmed) {
    return (
      <div className="py-16 max-w-lg mx-auto px-4 text-center space-y-6">
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white">
            Đơn đặt vé không ở trạng thái thành công
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Mã đơn <strong className="text-white">{booking.bookingCode}</strong> hiện có trạng thái:{' '}
            <strong className="text-rose-400 font-mono">{booking.status}</strong>.
            Hệ thống không phát hành vé cho các đơn đã hết hạn hoặc bị hủy.
          </p>
          <div className="pt-2">
            <Link to="/movies">
              <Button variant="primary" size="md">
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Chọn suất chiếu mới</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 6. CONFIRMED -> Display tickets & success summary
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Success Celebration Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-emerald-500/15 via-[#13151d] to-[#13151d] border border-emerald-500/30 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
            Đặt vé & Thanh toán thành công
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Chúc bạn xem phim vui vẻ!
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300">
            Mã đơn đặt vé:{' '}
            <strong className="text-[#e6e2c1] font-mono text-base">{booking.bookingCode}</strong>
          </p>
        </div>
      </div>

      {copyError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs text-center">
          {copyError}
        </div>
      )}

      {/* Showtime & Order Information */}
      <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-4 shadow-lg">
        <h2 className="text-xs font-bold text-[#e6e2c1] uppercase tracking-wider flex items-center gap-1.5">
          <Film className="w-4 h-4" />
          <span>Thông tin buổi chiếu</span>
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
                Suất chiếu: <strong>{formatVietnamDateTime(booking.startsAt)}</strong>
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#20232e] flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <span className="text-zinc-400">
              Số ghế: <strong className="text-white">{booking.seats.length} ghế</strong>
            </span>
            <span className="text-zinc-400">
              Tổng thanh toán:{' '}
              <strong className="text-base text-[#e6e2c1] font-mono font-bold">
                {formatCurrency(booking.totalAmount)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Issued Tickets Section */}
      <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#e6e2c1]" />
            <h2 className="text-base font-bold text-white">Danh sách vé đã phát hành</h2>
          </div>
          {isTicketsFetching && (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang đồng bộ...</span>
            </span>
          )}
        </div>

        {/* Tickets Loading */}
        {isTicketsLoading && (
          <div className="py-8">
            <LoadingSpinner message="Đang tải mã vé điện tử..." />
          </div>
        )}

        {/* Tickets Loading Error */}
        {isTicketsError && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Đã xác nhận thanh toán, chưa tải được vé</span>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              {ticketsError instanceof Error
                ? ticketsError.message
                : 'Máy chủ phản hồi chậm khi tải danh sách vé. Đơn hàng của bạn đã được xác nhận an toàn.'}
            </p>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetchTickets()}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử tải lại vé</span>
              </Button>
            </div>
          </div>
        )}

        {/* Render Issued Tickets */}
        {!isTicketsLoading && !isTicketsError && tickets && (
          <div className="grid grid-cols-1 gap-4">
            {tickets.map((t) => {
              const isCopied = copiedCode === t.ticketCode;
              return (
                <div
                  key={t.seatId}
                  className="p-4 rounded-xl bg-[#090a0f] border border-[#20232e] hover:border-[#323647] transition-all space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-[#181a24] text-[#e6e2c1] font-bold text-xs border border-[#242733]">
                      Ghế {t.label}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      HỢP LỆ
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                      Mã vé vào phòng:
                    </span>
                    <div className="flex min-w-0 items-center justify-between gap-2 bg-[#12141c] p-2 rounded-lg border border-[#20232e]">
                      <span className="min-w-0 flex-1 break-all font-mono font-black text-sm sm:text-base text-white tracking-widest select-all">
                        {t.ticketCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(t.ticketCode)}
                        title="Sao chép mã vé"
                        className="shrink-0 p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border-none cursor-pointer"
                        aria-label={`Sao chép mã vé ghế ${t.label}`}
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <Link to="/movies" className="w-full sm:w-auto">
          <Button variant="secondary" size="md" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Tiếp tục xem phim</span>
          </Button>
        </Link>
        <Link to="/my-tickets" className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            <span>Xem trong Vé của tôi</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
