import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Info,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useShowtimeSeats, useCurrentTime } from '@/features/showtimes';
import type { SeatItem } from '@/features/showtimes';
import {
  SeatMap,
  SeatLegend,
  BookingSummary,
  saveBookingIntent,
  getSavedBookingIntent,
  updateBookingIntentWithId,
  isMatchingIntent,
  bookingsApi,
} from '@/features/bookings';
import type { BookingIntent } from '@/features/bookings';
import { useAuth } from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { LoadingSpinner, ErrorState, EmptyState, Button } from '@/shared/components/ui';
import { formatVietnamDateTime, formatCurrency } from '@/shared/utils';
import { useQueryClient } from '@tanstack/react-query';

export const SeatSelectionPage: React.FC = () => {
  const { showtimeId: rawShowtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Validate showtimeId
  const isValidId = Boolean(rawShowtimeId && /^\d+$/.test(rawShowtimeId) && parseInt(rawShowtimeId, 10) > 0);
  const showtimeId = isValidId ? parseInt(rawShowtimeId!, 10) : null;

  // Context passed via router state (if user navigated from ShowtimesPage or MovieDetailPage)
  const routerState = location.state as {
    movieTitle?: string;
    cinemaName?: string;
    roomName?: string;
    startsAt?: string;
  } | null;

  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [removedAlert, setRemovedAlert] = useState<string | null>(null);
  const [maxWarning, setMaxWarning] = useState<string | null>(null);
  const [prevShowtimeId, setPrevShowtimeId] = useState(showtimeId);

  // FE-05 Booking Hold States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIntent, setActiveIntent] = useState<BookingIntent | null>(null);
  const [bookingError, setBookingError] = useState<{
    title: string;
    message: string;
    code?: string;
    canRetryIntent?: boolean;
  } | null>(null);

  // Synchronous double-click guard
  const isSubmittingRef = useRef(false);

  // Reset selections when showtimeId changes (React 19 pattern)
  if (showtimeId !== prevShowtimeId) {
    setPrevShowtimeId(showtimeId);
    setSelectedSeatIds([]);
    setRemovedAlert(null);
    setMaxWarning(null);
    setShowConfirmModal(false);
    setBookingError(null);
    setActiveIntent(null);
  }

  // Live timer for cutoff check
  const now = useCurrentTime(10_000);

  // Fetch seat map
  const {
    data: seatMap,
    isLoading,
    isError,
    error,
    refetch,
  } = useShowtimeSeats(showtimeId);

  // Compute cutoff
  const startsAt = seatMap?.startsAt || routerState?.startsAt;
  const bookingClosesAt = seatMap?.bookingClosesAt;

  const isCutoff = useMemo(() => {
    if (bookingClosesAt) {
      return now.getTime() >= new Date(bookingClosesAt).getTime();
    }
    if (startsAt) {
      const closeTime = new Date(new Date(startsAt).getTime() - 10 * 60 * 1000);
      return now.getTime() >= closeTime.getTime();
    }
    return false;
  }, [bookingClosesAt, startsAt, now]);

  // Check if seats currently selected were held or booked by someone else during polling
  useEffect(() => {
    if (!seatMap?.seats) return;
    // If submitting or in active intent waiting for retry, do not let polling mutate the payload
    if (isSubmittingRef.current) return;

    const seatMapById = new Map<number, SeatItem>(
      seatMap.seats.map((s) => [s.seatId, s])
    );

    setSelectedSeatIds((prevIds) => {
      if (prevIds.length === 0) return prevIds;

      const lostSeatLabels: string[] = [];
      const validIds: number[] = [];

      for (const id of prevIds) {
        const s = seatMapById.get(id);
        if (s && s.status === 'AVAILABLE') {
          validIds.push(id);
        } else if (s) {
          lostSeatLabels.push(s.label);
        }
      }

      if (lostSeatLabels.length > 0) {
        setRemovedAlert(
          `Ghế [${lostSeatLabels.join(
            ', '
          )}] vừa được người khác giữ chỗ hoặc đặt mua. Hệ thống đã tự động bỏ chọn.`
        );
        return validIds;
      }

      return prevIds;
    });
  }, [seatMap?.seats]);

  // Toggle seat selection
  const handleToggleSeat = (seat: SeatItem) => {
    if (isSubmitting) return;
    setMaxWarning(null);
    setBookingError(null);

    if (selectedSeatIds.includes(seat.seatId)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
    } else {
      if (selectedSeatIds.length >= 8) {
        setMaxWarning('Bạn chỉ có thể chọn tối đa 8 ghế trong một lần đặt.');
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seat.seatId]);
    }
  };

  const handleRemoveSeat = (seatId: number) => {
    if (isSubmitting) return;
    setMaxWarning(null);
    setBookingError(null);
    setSelectedSeatIds((prev) => prev.filter((id) => id !== seatId));
  };

  const allSeats = seatMap?.seats;

  // List of selected SeatItem objects
  const selectedSeats = useMemo(() => {
    if (!allSeats) return [];
    const map = new Map(allSeats.map((s) => [s.seatId, s]));
    return selectedSeatIds
      .map((id) => map.get(id))
      .filter((s): s is SeatItem => Boolean(s));
  }, [allSeats, selectedSeatIds]);

  const estimatedTotal = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + s.price, 0);
  }, [selectedSeats]);

  // Step 1: User clicks "Đặt vé" / "Tiếp tục" in BookingSummary
  const handleInitiateBooking = () => {
    setBookingError(null);

    // 1. Guest check -> redirect to login with safe internal redirect path
    if (!isAuthenticated || !user) {
      navigate('/login', {
        state: { from: location },
      });
      return;
    }

    // 2. Staff/Admin check -> only CUSTOMER can book
    if (user.role !== 'CUSTOMER') {
      setBookingError({
        title: 'Không thể tạo đơn đặt vé',
        message:
          'Tài khoản của bạn có vai trò ' +
          user.role +
          '. Chỉ tài khoản Khách hàng (CUSTOMER) mới có quyền tạo đơn đặt vé.',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    // 3. Selection count check
    if (selectedSeatIds.length < 1 || selectedSeatIds.length > 8) {
      setMaxWarning('Vui lòng chọn từ 1 đến 8 ghế.');
      return;
    }

    // 4. Cutoff check
    if (isCutoff) {
      setBookingError({
        title: 'Đã quá thời gian đặt vé',
        message: 'Đã quá thời hạn giữ chỗ cho suất chiếu (10 phút trước giờ chiếu).',
        code: 'BOOKING_CUTOFF_PASSED',
      });
      return;
    }

    // Open confirmation modal
    setShowConfirmModal(true);
  };

  // Step 2: Customer confirms hold -> executes POST /api/bookings
  const handleConfirmHold = async (customIntent?: BookingIntent) => {
    // Synchronous double-click guard
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setBookingError(null);

    try {
      if (!user || !showtimeId) {
        throw new Error('Thiếu thông tin người dùng hoặc suất chiếu.');
      }

      let intentToUse: BookingIntent;

      if (customIntent) {
        intentToUse = customIntent;
      } else {
        // Normalize seatIds: unique and sorted ascending
        const sortedSeatIds = Array.from(new Set(selectedSeatIds)).sort((a, b) => a - b);

        // Check if there is an existing intent in sessionStorage
        const savedIntent = getSavedBookingIntent(user.id);
        let clientRequestId: string;

        if (savedIntent && isMatchingIntent(savedIntent, showtimeId, sortedSeatIds)) {
          // Same intent: reuse clientRequestId
          clientRequestId = savedIntent.clientRequestId;
        } else {
          // New intent: generate fresh UUID
          clientRequestId = crypto.randomUUID();
        }

        intentToUse = {
          version: 1,
          userId: user.id,
          showtimeId,
          seatIds: sortedSeatIds,
          clientRequestId,
          createdAt: new Date().toISOString(),
        };

        // Save intent to sessionStorage BEFORE sending POST
        saveBookingIntent(intentToUse);
      }

      setActiveIntent(intentToUse);

      // POST /api/bookings
      const response = await bookingsApi.create({
        showtimeId: intentToUse.showtimeId,
        seatIds: intentToUse.seatIds,
        clientRequestId: intentToUse.clientRequestId,
      });

      // Update intent with created bookingId
      updateBookingIntentWithId(user.id, intentToUse.clientRequestId, response.bookingId);

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['showtime-seats', showtimeId],
      });
      queryClient.invalidateQueries({
        queryKey: ['bookings', user.id],
      });

      // Navigate to checkout
      navigate(`/bookings/${response.bookingId}/checkout`, {
        state: { fromBookingCreation: true },
      });
    } catch (err: unknown) {
      if (err instanceof ApiErrorResponse) {
        const status = err.status;
        const code = err.code;

        if (code === 'SEAT_UNAVAILABLE' || (status === 409 && code === 'SEAT_UNAVAILABLE')) {
          // All-or-nothing: refetch seat map and prompt to select again
          refetch();
          setBookingError({
            title: 'Ghế không còn khả dụng',
            message:
              'Một hoặc nhiều ghế bạn chọn đã bị người khác giữ chỗ hoặc đặt mua. Hệ thống không giữ một phần ghế, vui lòng chọn lại.',
            code: 'SEAT_UNAVAILABLE',
            canRetryIntent: false,
          });
        } else if (code === 'BOOKING_CUTOFF_PASSED' || status === 422 && code === 'BOOKING_CUTOFF_PASSED') {
          setBookingError({
            title: 'Đã quá hạn giữ chỗ',
            message:
              err.message ||
              'Suất chiếu đã bước vào khoảng thời gian đóng đặt vé (10 phút trước giờ bắt đầu).',
            code: 'BOOKING_CUTOFF_PASSED',
            canRetryIntent: false,
          });
        } else if (code === 'BOOKING_EXPIRED') {
          setBookingError({
            title: 'Đơn đã hết hạn',
            message: err.message || 'Thời gian giữ ghế đã kết thúc.',
            code: 'BOOKING_EXPIRED',
            canRetryIntent: false,
          });
        } else if (code === 'IDEMPOTENCY_CONFLICT') {
          setBookingError({
            title: 'Xung đột yêu cầu',
            message:
              err.message ||
              'Yêu cầu đặt vé bị xung đột idempotency. Vui lòng đóng cửa sổ và thử lại.',
            code: 'IDEMPOTENCY_CONFLICT',
            canRetryIntent: false,
          });
        } else if (code === 'BOOKING_CONCURRENT_CONFLICT') {
          setBookingError({
            title: 'Hệ thống đang bận',
            message:
              err.message ||
              'Hệ thống đang xử lý nhiều lượt đặt vé đồng thời. Bạn có thể bấm Thử lại.',
            code: 'BOOKING_CONCURRENT_CONFLICT',
            canRetryIntent: true,
          });
        } else if (code === 'NETWORK_ERROR' || !status || status >= 500) {
          // Indeterminate result: timeout / 5xx / connection loss
          setBookingError({
            title: 'Chưa xác định kết quả',
            message:
              'Yêu cầu đặt vé gặp sự cố kết nối hoặc phản hồi chậm từ máy chủ. Máy chủ có thể đã ghi nhận đơn. Vui lòng bấm "Thử lại đối soát" để kiểm tra kết quả mà không tạo thêm đơn mới.',
            code: 'INDETERMINATE',
            canRetryIntent: true,
          });
        } else {
          setBookingError({
            title: 'Không thể tạo đơn đặt vé',
            message: err.message || 'Đã có lỗi xảy ra từ máy chủ.',
            code,
            canRetryIntent: false,
          });
        }
      } else {
        setBookingError({
          title: 'Chưa xác định kết quả',
          message:
            'Gặp sự cố kết nối tới máy chủ. Vui lòng bấm "Thử lại đối soát" để gửi lại cùng mã yêu cầu.',
          code: 'INDETERMINATE',
          canRetryIntent: true,
        });
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // 1. Invalid showtimeId in URL
  if (!isValidId) {
    return (
      <div className="py-16 max-w-xl mx-auto px-4 text-center space-y-6">
        <ErrorState
          title="Mã suất chiếu không hợp lệ"
          message="Vui lòng kiểm tra lại đường dẫn hoặc chọn suất chiếu trong trang chi tiết phim."
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

  // 2. Loading state
  if (isLoading) {
    return (
      <div className="py-20">
        <LoadingSpinner message="Đang tải sơ đồ ghế suất chiếu..." />
      </div>
    );
  }

  // 3. Error state
  if (isError || !seatMap) {
    return (
      <div className="py-16 max-w-xl mx-auto px-4 space-y-6">
        <ErrorState
          title="Không thể tải sơ đồ ghế"
          message={
            error instanceof Error
              ? error.message
              : 'Đã có lỗi xảy ra khi tải dữ liệu ghế từ máy chủ.'
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

  const seats = seatMap.seats || [];

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-16">
      <header className="border-b border-[#30313b] pb-6">
        <Link to="/movies" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-[#e6e2c1] focus-visible:outline-2 focus-visible:outline-[#e6e2c1] rounded-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Trở lại danh sách phim
        </Link>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
          {routerState?.movieTitle || 'Chọn ghế xem phim'}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400 mt-3">
          {routerState?.cinemaName && <span className="text-zinc-200">{routerState.cinemaName}</span>}
          {routerState?.roomName && <span>{routerState.roomName}</span>}
          {startsAt && <time dateTime={startsAt}>{formatVietnamDateTime(startsAt)}</time>}
          {!routerState?.cinemaName && !routerState?.roomName && <span>Mã suất #{showtimeId}</span>}
        </div>
        {isCutoff && <p className="mt-2 text-sm text-rose-300">Đã ngừng nhận đặt vé</p>}
      </header>

      {/* Cutoff Warning Banner */}
      {isCutoff && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold">Đã quá thời gian đặt vé cho suất chiếu này</p>
            <p className="text-amber-300/80 leading-relaxed">
              Theo quy định, hệ thống đóng chức năng giữ chỗ và đặt vé 10 phút trước giờ chiếu.
              Vui lòng vào chi tiết phim để chọn một suất chiếu khác.
            </p>
          </div>
        </div>
      )}

      {/* Auto-deselection alert */}
      {removedAlert && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3 text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm">{removedAlert}</p>
          </div>
          <button
            type="button"
            onClick={() => setRemovedAlert(null)}
            className="text-xs text-rose-300 hover:text-white shrink-0 cursor-pointer border-none bg-transparent"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Maximum seat warning */}
      {maxWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-200 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{maxWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setMaxWarning(null)}
            className="text-amber-400 hover:text-amber-200"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Booking Error Banner */}
      {bookingError && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start justify-between gap-4 ${
            bookingError.code === 'INDETERMINATE'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
          }`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                bookingError.code === 'INDETERMINATE' ? 'text-amber-400' : 'text-rose-400'
              }`}
            />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-white">{bookingError.title}</h3>
              <p className="text-xs leading-relaxed text-zinc-300">{bookingError.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {bookingError.canRetryIntent && activeIntent && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConfirmHold(activeIntent)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>Thử lại đối soát</span>
              </Button>
            )}
            <button
              type="button"
              onClick={() => setBookingError(null)}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 cursor-pointer border-none bg-transparent"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {seats.length === 0 ? (
            <EmptyState
              title="Chưa có sơ đồ ghế"
              description="Suất chiếu này hiện tại chưa có danh sách ghế khả dụng để đặt vé."
            />
          ) : (
            <SeatMap
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={handleToggleSeat}
              isCutoff={isCutoff || isSubmitting}
            />
          )}
          <SeatLegend />
        </div>

        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6">
          <BookingSummary
            selectedSeats={selectedSeats}
            onRemoveSeat={handleRemoveSeat}
            isCutoff={isCutoff}
            onContinue={handleInitiateBooking}
          />
        </div>
      </div>

      {/* FE-05 Hold Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#171922] border border-[#323440] rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">Xác nhận giữ ghế</h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedSeats.map((s) => (
                  <span
                    key={s.seatId}
                    className="px-2.5 py-1 rounded-lg bg-[#181a24] text-[#e6e2c1] font-bold text-xs border border-[#242733]"
                  >
                    {s.label} ({s.seatType})
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-[#343744] pt-4 text-sm text-zinc-300 space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-[#e6e2c1]">
                <Clock className="w-4 h-4" />
                <span>Thời hạn giữ chỗ: 5 phút</span>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">Ghế sẽ được giải phóng nếu bạn chưa thanh toán sau 5 phút.</p>
              <div className="flex items-center justify-between font-semibold text-sm text-white">
                <span>Tạm tính</span>
                <span className="text-[#e6e2c1]">{formatCurrency(estimatedTotal)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleConfirmHold()}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Đang giữ ghế...' : 'Xác nhận giữ ghế'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
