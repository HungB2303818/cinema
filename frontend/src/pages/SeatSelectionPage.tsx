import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  Building2,
  CheckCircle2,
  Film,
} from 'lucide-react';
import { useShowtimeSeats, useCurrentTime } from '@/features/showtimes';
import type { SeatItem } from '@/features/showtimes';
import {
  SeatMap,
  SeatLegend,
  BookingSummary,
} from '@/features/bookings';
import { LoadingSpinner, ErrorState, EmptyState, Button } from '@/shared/components/ui';
import { formatVietnamDateTime } from '@/shared/utils';

export const SeatSelectionPage: React.FC = () => {
  const { showtimeId: rawShowtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

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
  const [showBoundaryModal, setShowBoundaryModal] = useState(false);
  const [prevShowtimeId, setPrevShowtimeId] = useState(showtimeId);

  // Reset selections when showtimeId changes (React 19 pattern)
  if (showtimeId !== prevShowtimeId) {
    setPrevShowtimeId(showtimeId);
    setSelectedSeatIds([]);
    setRemovedAlert(null);
    setMaxWarning(null);
    setShowBoundaryModal(false);
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
    setMaxWarning(null);
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
    setMaxWarning(null);
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

  // 1. Invalid showtimeId in URL
  if (!isValidId) {
    return (
      <div className="py-16 max-w-xl mx-auto px-4 text-center space-y-6">
        <ErrorState
          title="Mã suất chiếu không hợp lệ"
          message="Vui lòng kiểm tra lại đường dẫn hoặc chọn suất chiếu từ trang lịch chiếu."
        />
        <Link to="/showtimes">
          <Button variant="secondary" size="md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Quay lại lịch chiếu</span>
          </Button>
        </Link>
      </div>
    );
  }

  // 2. Loading state
  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner message="Đang tải sơ đồ ghế suất chiếu..." />
      </div>
    );
  }

  // 3. Error state (404 vs Network)
  if (isError) {
    const isNotFound =
      axios.isAxiosError(error) && error.response?.status === 404;

    return (
      <div className="py-16 max-w-xl mx-auto px-4 text-center space-y-6">
        <ErrorState
          title={isNotFound ? 'Suất chiếu không tồn tại' : 'Lỗi tải sơ đồ ghế'}
          message={
            isNotFound
              ? 'Suất chiếu này không tồn tại hoặc đã bị hủy khỏi hệ thống.'
              : 'Không thể kết nối đến máy chủ để tải sơ đồ ghế. Vui lòng kiểm tra kết nối mạng và thử lại.'
          }
          onRetry={isNotFound ? undefined : () => refetch()}
        />
        <div className="flex justify-center gap-3">
          <Button variant="secondary" size="md" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Quay lại</span>
          </Button>
          <Link to="/showtimes">
            <Button variant="primary" size="md">
              Xem lịch chiếu khác
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const seats = seatMap?.seats || [];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Showtime Info Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#13151d] border border-[#242733] text-xs text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-[#e6e2c1]" />
            <span>Mã suất #{showtimeId}</span>
          </div>
        </div>

        {/* Showtime Context Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#13151d] via-[#161924] to-[#10121a] border border-[#242733] p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e6e2c1]">
                <Film className="w-4 h-4" />
                <span>Chọn ghế xem phim</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {routerState?.movieTitle || 'Sơ đồ ghế xem phim'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 pt-1">
                {routerState?.cinemaName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{routerState.cinemaName}</span>
                    {routerState.roomName ? ` (${routerState.roomName})` : ''}
                  </span>
                )}
                {startsAt && (
                  <span className="flex items-center gap-1 text-[#e6e2c1] font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatVietnamDateTime(startsAt)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Live Cutoff Status Badge */}
            <div>
              {isCutoff ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Đã ngừng nhận đặt vé</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Đang nhận đặt vé trực tuyến</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Warnings / Alerts */}
      {removedAlert && (
        <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-800/80 text-amber-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{removedAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setRemovedAlert(null)}
            className="text-amber-400 hover:text-amber-200"
          >
            Đóng
          </button>
        </div>
      )}

      {maxWarning && (
        <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{maxWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setMaxWarning(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Grid: Left is Seat Map & Legend, Right is Booking Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Seat Map Column */}
        <div className="lg:col-span-8 space-y-6">
          <SeatLegend />

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
              isCutoff={isCutoff}
            />
          )}
        </div>

        {/* Right Summary Sidebar */}
        <div className="lg:col-span-4 sticky top-6">
          <BookingSummary
            selectedSeats={selectedSeats}
            onRemoveSeat={handleRemoveSeat}
            startsAt={startsAt}
            movieTitle={routerState?.movieTitle}
            cinemaName={routerState?.cinemaName}
            roomName={routerState?.roomName}
            isCutoff={isCutoff}
            onContinue={() => setShowBoundaryModal(true)}
          />
        </div>
      </div>

      {/* FE-05 Boundary Modal */}
      {showBoundaryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#13151d] border border-[#242733] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-full bg-[#e6e2c1]/10 text-[#e6e2c1] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">
                Đã chọn ghế thành công (FE-04)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Bạn đã chọn {selectedSeats.length} ghế:{' '}
                <strong className="text-[#e6e2c1]">
                  {selectedSeats.map((s) => s.label).join(', ')}
                </strong>
                .
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#090a0f] border border-[#20232e] text-xs text-zinc-300 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#e6e2c1]">
                <Info className="w-4 h-4" />
                <span>Ranh giới tính năng:</span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Chức năng tạo đơn đặt vé, giữ chỗ và thanh toán thuộc phạm vi tính năng{' '}
                <strong className="text-zinc-200">FE-05</strong> và đang được phát triển.
                Hệ thống chưa tạo đơn hay trừ tiền.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowBoundaryModal(false)}
                className="w-full"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
