import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  Building2,
  Film,
  Calendar,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Info,
  Check,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { useBookingDetail } from '@/features/bookings';
import {
  paymentsApi,
  getSavedPaymentAttempt,
  savePaymentAttempt,
  clearPaymentAttempt,
} from '@/features/payments';
import type { PaymentSimulatedResult, PaymentAttempt } from '@/features/payments';
import { useAuth } from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { LoadingSpinner, ErrorState, Button } from '@/shared/components/ui';
import { formatCurrency, formatVietnamDateTime } from '@/shared/utils';
import { useQueryClient } from '@tanstack/react-query';

export const CheckoutPage: React.FC = () => {
  const { bookingId: rawBookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isValidId = Boolean(
    rawBookingId && /^\d+$/.test(rawBookingId) && parseInt(rawBookingId, 10) > 0
  );
  const bookingId = isValidId ? parseInt(rawBookingId!, 10) : null;

  // Real-time timestamp state
  const [now, setNow] = useState(() => Date.now());

  // Fetch authoritative booking detail from backend
  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useBookingDetail(bookingId, {
    enabled: isValidId && Boolean(user?.id),
    polling: true, // Auto polls every 10s while pending
  });

  // Keep timestamp fresh and handle tab sleep wake-up
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

  // Compute remaining seconds from server expiresAt: max(0, expiresAt - now)
  const bookingExpiresAt = booking?.expiresAt;
  const remainingSeconds = useMemo(() => {
    if (!bookingExpiresAt) return 0;
    const expiresMs = new Date(bookingExpiresAt).getTime();
    return Math.max(0, Math.floor((expiresMs - now) / 1000));
  }, [bookingExpiresAt, now]);

  // When timer reaches 0, trigger refetch to sync authoritative server status
  const hasRefetchedOnExpiry = useRef(false);
  useEffect(() => {
    if (
      booking &&
      booking.status === 'PENDING' &&
      remainingSeconds === 0 &&
      !hasRefetchedOnExpiry.current
    ) {
      hasRefetchedOnExpiry.current = true;
      refetch();
      if (booking.showtimeId) {
        queryClient.invalidateQueries({
          queryKey: ['showtime-seats', booking.showtimeId],
        });
      }
    }
  }, [booking, remainingSeconds, refetch, queryClient]);

  // Format MM:SS
  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine effective status: server is authoritative
  const isConfirmed =
    booking?.status === 'CONFIRMED' || booking?.effectiveStatus === 'CONFIRMED';
  const isExpired =
    booking?.effectiveStatus === 'EXPIRED' ||
    (booking?.status === 'PENDING' && remainingSeconds === 0);
  const isPending =
    (booking?.effectiveStatus === 'PENDING' || booking?.status === 'PENDING') &&
    remainingSeconds > 0 &&
    !isConfirmed;
  const isCancelled = booking?.status === 'CANCELLED';

  // ==================== FE-06 Payment Attempt States ====================
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Active attempt restored from sessionStorage (e.g. after refresh on timeout)
  const [activeAttempt, setActiveAttempt] = useState<PaymentAttempt | null>(() => {
    if (user?.id && bookingId) {
      return getSavedPaymentAttempt(user.id, bookingId);
    }
    return null;
  });

  const [paymentError, setPaymentError] = useState<{
    title: string;
    message: string;
    code?: string;
    isIndeterminate?: boolean;
  } | null>(() => {
    if (activeAttempt && activeAttempt.status === 'INDETERMINATE') {
      return {
        title: 'Chưa xác định kết quả thanh toán',
        message:
          'Yêu cầu thanh toán trước đó chưa nhận được xác nhận từ máy chủ. Vui lòng bấm "Kiểm tra & Thử lại đối soát".',
        isIndeterminate: true,
      };
    }
    return null;
  });

  const [failedNotice, setFailedNotice] = useState<string | null>(null);

  // Execute Mock Payment
  const handleMockPayment = async (
    result: PaymentSimulatedResult,
    retryAttempt?: PaymentAttempt
  ) => {
    // Synchronous double-click guard
    if (isSubmittingRef.current) return;
    if (!booking || !user || !bookingId) return;

    if (user.role !== 'CUSTOMER') {
      setPaymentError({
        title: 'Không có quyền thao tác',
        message: 'Chỉ tài khoản khách hàng (CUSTOMER) mới được thực hiện thanh toán.',
      });
      return;
    }

    if (!isPending || remainingSeconds === 0) {
      setPaymentError({
        title: 'Đơn đặt vé đã hết hạn',
        message: 'Thời hạn giữ ghế 5 phút đã kết thúc. Vui lòng chọn suất chiếu khác.',
      });
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setPaymentError(null);
    setFailedNotice(null);

    let attemptToUse: PaymentAttempt;

    if (retryAttempt) {
      // Retrying technical attempt: use the exact same key and payload
      attemptToUse = retryAttempt;
    } else {
      // Determine idempotency key
      const saved = getSavedPaymentAttempt(user.id, bookingId);
      let idempotencyKey: string;

      if (
        saved &&
        saved.status === 'INDETERMINATE' &&
        saved.simulatedResult === result
      ) {
        // Reuse key for retry of indeterminate result with same payload
        idempotencyKey = saved.idempotencyKey;
      } else {
        // Generate new key for new attempt
        idempotencyKey = crypto.randomUUID();
      }

      attemptToUse = {
        version: 1,
        userId: user.id,
        bookingId,
        simulatedResult: result,
        idempotencyKey,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };
    }

    // Save attempt before POST
    savePaymentAttempt(attemptToUse);
    setActiveAttempt(attemptToUse);

    try {
      const response = await paymentsApi.mockPayment(bookingId, {
        simulatedResult: attemptToUse.simulatedResult,
        idempotencyKey: attemptToUse.idempotencyKey,
      });

      // Clear attempt on verified response
      clearPaymentAttempt(user.id, bookingId);
      setActiveAttempt(null);

      // Handle SUCCESS
      if (response.paymentStatus === 'SUCCESS' || response.status === 'CONFIRMED') {
        queryClient.invalidateQueries({ queryKey: ['booking-detail', bookingId] });
        if (booking.showtimeId) {
          queryClient.invalidateQueries({
            queryKey: ['showtime-seats', booking.showtimeId],
          });
        }
        queryClient.invalidateQueries({ queryKey: ['booking-tickets', user.id, bookingId] });
        queryClient.invalidateQueries({ queryKey: ['bookings', user.id] });

        navigate(`/bookings/${bookingId}/success`, { replace: true });
        return;
      }

      // Handle FAILED (HTTP 200 with paymentStatus === 'FAILED')
      // Ensure replay FAILED does not downgrade if booking is already CONFIRMED
      const latest = await refetch();
      if (
        latest.data?.status === 'CONFIRMED' ||
        latest.data?.effectiveStatus === 'CONFIRMED'
      ) {
        navigate(`/bookings/${bookingId}/success`, { replace: true });
        return;
      }

      setFailedNotice(
        response.message ||
          'Lần thanh toán mô phỏng thất bại. Bạn có thể thử lại một lượt thanh toán mới nếu thời gian giữ ghế còn hạn.'
      );
    } catch (err: unknown) {
      // Distinguish network error / timeout / 5xx from business errors
      const isNetworkOr5xx =
        err instanceof ApiErrorResponse
          ? !err.status || err.status >= 500 || err.code === 'NETWORK_ERROR'
          : err instanceof Error && !('status' in err);

      if (isNetworkOr5xx) {
        const indetAttempt: PaymentAttempt = {
          ...attemptToUse,
          status: 'INDETERMINATE',
        };
        savePaymentAttempt(indetAttempt);
        setActiveAttempt(indetAttempt);
        setPaymentError({
          title: 'Chưa xác định kết quả thanh toán',
          message:
            'Yêu cầu thanh toán gặp sự cố kết nối hoặc máy chủ phản hồi chậm. Máy chủ có thể đã ghi nhận thanh toán. Vui lòng bấm "Kiểm tra & Thử lại đối soát" để kiểm tra trạng thái trước khi tạo thanh toán mới.',
          isIndeterminate: true,
        });
      } else if (err instanceof ApiErrorResponse) {
        const { code, status } = err;
        if (code === 'BOOKING_EXPIRED' || status === 422) {
          clearPaymentAttempt(user.id, bookingId);
          setActiveAttempt(null);
          setPaymentError({
            title: 'Đơn đặt vé đã hết hạn',
            message: 'Thời hạn giữ ghế 5 phút đã kết thúc. Không thể tiếp tục thanh toán.',
            code: 'BOOKING_EXPIRED',
          });
          refetch();
        } else if (code === 'BOOKING_STATE_CONFLICT' || status === 409) {
          const check = await refetch();
          if (
            check.data?.status === 'CONFIRMED' ||
            check.data?.effectiveStatus === 'CONFIRMED'
          ) {
            clearPaymentAttempt(user.id, bookingId);
            setActiveAttempt(null);
            navigate(`/bookings/${bookingId}/success`, { replace: true });
            return;
          }
          setPaymentError({
            title: 'Xung đột trạng thái đơn hàng',
            message: err.message || 'Trạng thái đơn hàng không hợp lệ để thanh toán.',
            code: 'BOOKING_STATE_CONFLICT',
          });
        } else if (code === 'IDEMPOTENCY_CONFLICT') {
          setPaymentError({
            title: 'Xung đột khóa thanh toán',
            message:
              err.message ||
              'Khóa thanh toán đã được sử dụng với thông tin khác. Vui lòng thử lại.',
            code: 'IDEMPOTENCY_CONFLICT',
          });
        } else {
          setPaymentError({
            title: 'Không thể thực hiện thanh toán',
            message: err.message || 'Đã có lỗi xảy ra từ máy chủ.',
            code,
          });
        }
      } else {
        setPaymentError({
          title: 'Lỗi không xác định',
          message:
            err instanceof Error
              ? err.message
              : 'Đã có lỗi xảy ra khi xử lý thanh toán.',
        });
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Reconcile indeterminate attempt
  const handleReconcileIndeterminate = async () => {
    if (!activeAttempt || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setPaymentError(null);

    try {
      // 1. Refetch current booking status from server
      const result = await refetch();
      if (
        result.data?.status === 'CONFIRMED' ||
        result.data?.effectiveStatus === 'CONFIRMED'
      ) {
        clearPaymentAttempt(user!.id, bookingId!);
        setActiveAttempt(null);
        navigate(`/bookings/${bookingId}/success`, { replace: true });
        return;
      }

      // 2. If still PENDING, retry with the EXACT SAME attempt
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      await handleMockPayment(activeAttempt.simulatedResult, activeAttempt);
    } catch {
      setPaymentError({
        title: 'Chưa xác định kết quả thanh toán',
        message: 'Vẫn chưa thể kết nối tới máy chủ. Vui lòng thử lại sau giây lát.',
        isIndeterminate: true,
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // 1. Invalid Booking ID
  if (!isValidId) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-6">
        <ErrorState
          title="Mã đơn đặt vé không hợp lệ"
          message="Đường dẫn không đúng hoặc thiếu mã đơn. Vui lòng kiểm tra lại."
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

  // 2. Loading
  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner message="Đang tải thông tin đơn đặt vé..." />
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20232e] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#e6e2c1] uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Thông Tin Đặt Vé & Thanh Toán</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Mã đơn: <span className="text-[#e6e2c1] font-mono">{booking.bookingCode}</span>
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
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
          ) : isExpired ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Hết hạn giữ chỗ (EXPIRED)</span>
            </span>
          ) : isCancelled ? (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-700/40 text-zinc-400 border border-zinc-700 flex items-center gap-1.5">
              <span>Đã hủy (CANCELLED)</span>
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
              <Clock className="w-4 h-4" />
              <span>Đang giữ chỗ (PENDING)</span>
            </span>
          )}
        </div>
      </div>

      {/* Countdown Timer Banner (Only when PENDING) */}
      {isPending && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#181a24] to-[#13151d] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Thời gian giữ ghế còn lại</h2>
              <p className="text-xs text-zinc-400">
                Ghế sẽ tự động được giải phóng khi đồng hồ về 00:00 nếu chưa hoàn tất thanh toán.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-amber-400 bg-[#090a0f] px-4 py-2 rounded-xl border border-amber-500/30 shadow-inner">
              {formatCountdown(remainingSeconds)}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              title="Làm mới trạng thái từ máy chủ"
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border-none"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Expiry Banner if EXPIRED */}
      {isExpired && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3.5 text-rose-200">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs sm:text-sm">
            <h2 className="font-bold text-base text-rose-300">
              Đơn đặt vé đã hết thời hạn giữ ghế (5 phút)
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              Thời gian giữ chỗ tạm thời đã kết thúc. Các ghế trong đơn này đã được mở lại
              cho khách hàng khác có thể đặt.
            </p>
            <div className="pt-2">
              <Link to="/movies">
                <Button variant="primary" size="sm">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  <span>Chọn suất chiếu khác</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Payment Error / Indeterminate Notice */}
      {paymentError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-200 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-300">{paymentError.title}</p>
              <p className="text-zinc-300 text-xs leading-relaxed mt-0.5">
                {paymentError.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {paymentError.isIndeterminate && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleReconcileIndeterminate}
                disabled={isSubmitting}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>Kiểm tra & Thử lại đối soát</span>
              </Button>
            )}
            <button
              type="button"
              onClick={() => setPaymentError(null)}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 cursor-pointer border-none bg-transparent"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Simulated Payment Failed Notice */}
      {failedNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-amber-200 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">Thanh toán mô phỏng thất bại</p>
              <p className="text-zinc-300 text-xs leading-relaxed mt-0.5">
                {failedNotice}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFailedNotice(null)}
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 cursor-pointer border-none bg-transparent"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Showtime & Seats Snapshot */}
        <div className="md:col-span-8 space-y-6">
          {/* Showtime Card */}
          <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider flex items-center gap-1.5">
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

          {/* Seat Snapshot Table */}
          <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider">
                Danh sách ghế đã giữ ({booking.seats.length} ghế)
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

        {/* Right Column: Server Total & Payment Controls */}
        <div className="md:col-span-4 space-y-6">
          <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-5 shadow-lg">
            <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider">
              Tổng tiền thanh toán
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
              <p className="text-[11px] text-zinc-500 italic">
                * Tổng tiền được hệ thống máy chủ tính toán chính thức từ snapshot giá suất chiếu.
              </p>
            </div>

            {/* FE-06 Mock Payment Disclaimer */}
            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#20232e] text-xs text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#e6e2c1]">
                <Info className="w-3.5 h-3.5" />
                <span>Thanh toán mô phỏng — không thu tiền thật</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                Hệ thống hỗ trợ mô phỏng kết quả thanh toán trực tiếp để kiểm thử quy trình giữ
                chỗ và phát hành vé điện tử.
              </p>
            </div>

            {/* Role Warning if not CUSTOMER */}
            {user?.role !== 'CUSTOMER' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Tài khoản vai trò {user?.role} không thể thực hiện thanh toán khách hàng.
                </span>
              </div>
            )}

            {/* Payment Action Buttons */}
            <div className="space-y-3 pt-2">
              {isPending && user?.role === 'CUSTOMER' && (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleMockPayment('SUCCESS')}
                    disabled={isSubmitting || (activeAttempt?.status === 'INDETERMINATE')}
                    className="w-full justify-center gap-2 font-bold py-3 shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Đang xử lý...'
                        : 'Mô phỏng thanh toán thành công'}
                    </span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleMockPayment('FAILED')}
                    disabled={isSubmitting || (activeAttempt?.status === 'INDETERMINATE')}
                    className="w-full py-2.5 px-4 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Mô phỏng thanh toán thất bại</span>
                  </button>
                </>
              )}

              {isConfirmed && (
                <Link to={`/bookings/${bookingId}/success`} className="block w-full">
                  <Button variant="primary" size="md" className="w-full gap-2 font-bold py-3 shadow-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xem vé đã phát hành</span>
                  </Button>
                </Link>
              )}

              {isExpired && (
                <div className="text-center py-2 text-xs text-rose-400 font-medium">
                  Đơn đã hết hạn giữ chỗ. Không thể thực hiện thanh toán.
                </div>
              )}

              <Link to="/movies" className="block w-full pt-1">
                <Button variant="secondary" size="md" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Chọn phim khác</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
