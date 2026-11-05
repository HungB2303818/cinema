import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Clock,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  Tv,
  Film,
} from 'lucide-react';
import {
  useAdminShowtimeDetail,
  useCreateShowtime,
  useUpdateShowtime,
  type ShowtimeCreatedResponse,
} from '@/features/showtimes';
import { useAdminCinemas, useAdminRooms, useAdminSeats } from '@/features/cinemas';
import { useAdminMovies } from '@/features/movies';
import {
  Button,
  Input,
  AlertMessage,
  LoadingSpinner,
} from '@/shared/components/ui';
import {
  formatCurrency,
  vietnamLocalInputToUtcIso,
  utcIsoToVietnamLocalInput,
  addMinutesToVietnamLocal,
} from '@/shared/utils/format';
import type { ApiError, FieldErrorItem } from '@/shared/types/api.types';
import { ApiErrorResponse } from '@/shared/api/http-client';

export const AdminShowtimeFormPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isEdit = Boolean(showtimeId);
  const numericShowtimeId = showtimeId ? parseInt(showtimeId, 10) : undefined;

  // Initial params from URL query (e.g. from Rooms page link)
  const initialCinemaId = searchParams.get('cinemaId')
    ? parseInt(searchParams.get('cinemaId')!, 10)
    : undefined;
  const initialRoomId = searchParams.get('roomId')
    ? parseInt(searchParams.get('roomId')!, 10)
    : undefined;

  // Form states
  const [movieId, setMovieId] = useState<number | ''>('');
  const [cinemaId, setCinemaId] = useState<number | ''>(initialCinemaId || '');
  const [roomId, setRoomId] = useState<number | ''>(initialRoomId || '');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [cleanupMinutes, setCleanupMinutes] = useState(15);
  const [basePrice, setBasePrice] = useState<number | ''>(75000);
  const [vipSurcharge, setVipSurcharge] = useState<number | ''>(20000);

  // Status & feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<ShowtimeCreatedResponse | null>(null);

  // Queries
  const { data: moviesData, isLoading: isLoadingMovies } = useAdminMovies({ size: 100 });
  const { data: cinemasData, isLoading: isLoadingCinemas } = useAdminCinemas(0, 100, 'name,asc');
  const { data: roomsData, isLoading: isLoadingRooms } = useAdminRooms(
    typeof cinemaId === 'number' ? cinemaId : undefined,
    0,
    100,
    'name,asc'
  );

  const {
    data: existingShowtime,
    isLoading: isLoadingDetail,
    isError: isErrorDetail,
  } = useAdminShowtimeDetail(numericShowtimeId);

  // Mutations
  const createMutation = useCreateShowtime();
  const updateMutation = useUpdateShowtime(numericShowtimeId);

  const needsSeatCheck = !isEdit || (existingShowtime && roomId !== existingShowtime.roomId);
  const {
    data: roomSeats,
    isFetching: isCheckingSeats,
    isError: isSeatsError,
    refetch: refetchSeats,
  } = useAdminSeats(needsSeatCheck && typeof roomId === 'number' ? roomId : undefined);
  const hasNoActiveSeats = Boolean(needsSeatCheck && roomSeats && !roomSeats.some((seat) => seat.status === 'ACTIVE'));
  const isSeatCheckBlocked = Boolean(needsSeatCheck && roomId && (isCheckingSeats || isSeatsError || !roomSeats || hasNoActiveSeats));

  // Populate data when editing
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (existingShowtime && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setMovieId(existingShowtime.movieId);
      setCinemaId(existingShowtime.cinemaId);
      setRoomId(existingShowtime.roomId);
      setStartsAt(utcIsoToVietnamLocalInput(existingShowtime.startsAt));
      setEndsAt(utcIsoToVietnamLocalInput(existingShowtime.endsAt));
      setCleanupMinutes(existingShowtime.cleanupMinutes ?? 15);
      setBasePrice(existingShowtime.basePrice);
      setVipSurcharge(existingShowtime.vipSurcharge ?? 0);
    }
  }, [existingShowtime]);

  // Filter out HIDDEN movies - Admin cannot schedule hidden movies
  const schedulableMovies = useMemo(() => {
    if (!moviesData?.content) return [];
    return moviesData.content.filter((m) => m.status !== 'HIDDEN');
  }, [moviesData]);

  // Active rooms only
  const activeRooms = useMemo(() => {
    if (!roomsData?.content) return [];
    return roomsData.content.filter((r) => r.status === 'ACTIVE');
  }, [roomsData]);

  // Selected movie details for duration
  const selectedMovie = useMemo(() => {
    if (!movieId || !moviesData?.content) return null;
    return moviesData.content.find((m) => m.id === movieId);
  }, [movieId, moviesData]);

  // Auto-suggest endsAt based on startsAt and movie duration
  const handleSuggestEndsAt = () => {
    if (!startsAt) {
      setFormError('Vui lòng chọn thời gian bắt đầu trước khi gợi ý giờ kết thúc.');
      return;
    }
    if (!selectedMovie?.durationMinutes) {
      setFormError('Vui lòng chọn phim để lấy thời lượng chiếu.');
      return;
    }
    const suggested = addMinutesToVietnamLocal(startsAt, selectedMovie.durationMinutes);
    setEndsAt(suggested);
    setFormError(null);
  };

  // Next available room time calculation
  const nextAvailableTime = useMemo(() => {
    if (!endsAt) return '';
    try {
      return addMinutesToVietnamLocal(endsAt, cleanupMinutes || 0);
    } catch {
      return '';
    }
  }, [endsAt, cleanupMinutes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!movieId) {
      setFormError('Vui lòng chọn phim.');
      return;
    }
    if (!cinemaId || !roomId) {
      setFormError('Vui lòng chọn cụm rạp và phòng chiếu.');
      return;
    }
    if (isSeatCheckBlocked) {
      setFormError('Phòng phải có ghế ACTIVE trước khi tạo suất chiếu. Vui lòng kiểm tra cấu hình ghế.');
      return;
    }
    if (!startsAt || !endsAt) {
      setFormError('Vui lòng chọn thời gian bắt đầu và kết thúc chiếu.');
      return;
    }

    // Convert local VN datetime to UTC ISO string
    let startsAtUtc: string;
    let endsAtUtc: string;
    try {
      startsAtUtc = vietnamLocalInputToUtcIso(startsAt);
      endsAtUtc = vietnamLocalInputToUtcIso(endsAt);
    } catch {
      setFormError('Định dạng thời gian không hợp lệ.');
      return;
    }

    const startMs = new Date(startsAtUtc).getTime();
    const endMs = new Date(endsAtUtc).getTime();

    if (endMs <= startMs) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    if (selectedMovie && endMs < startMs + selectedMovie.durationMinutes * 60 * 1000) {
      setFormError(
        `Thời lượng chiếu không đủ cho phim "${selectedMovie.title}" (${selectedMovie.durationMinutes} phút).`
      );
      return;
    }

    const numericBasePrice = typeof basePrice === 'number' ? basePrice : 0;
    const numericVipSurcharge = typeof vipSurcharge === 'number' ? vipSurcharge : 0;

    if (numericBasePrice < 0) {
      setFormError('Giá vé cơ bản không được âm.');
      return;
    }
    if (numericVipSurcharge < 0) {
      setFormError('Phụ thu VIP không được âm.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      movieId,
      roomId,
      startsAt: startsAtUtc,
      endsAt: endsAtUtc,
      cleanupMinutes: typeof cleanupMinutes === 'number' ? cleanupMinutes : 15,
      basePrice: numericBasePrice,
      vipSurcharge: numericVipSurcharge,
    };

    try {
      if (isEdit && numericShowtimeId) {
        await updateMutation.mutateAsync(payload);
        navigate('/admin/showtimes');
      } else {
        const res = await createMutation.mutateAsync(payload);
        setCreatedResult(res);
      }
    } catch (err: unknown) {
      let code: string | undefined;
      let message: string | undefined;
      let fieldErrors: FieldErrorItem[] | undefined;

      if (err instanceof ApiErrorResponse) {
        code = err.code;
        message = err.message;
        fieldErrors = err.fieldErrors;
      } else {
        const apiErr = err as { response?: { data?: ApiError } };
        code = apiErr.response?.data?.code;
        message = apiErr.response?.data?.message;
        fieldErrors = apiErr.response?.data?.fieldErrors;
      }

      if (code === 'SHOWTIME_OVERLAP') {
        setFormError(
          'Suất chiếu bị trùng thời gian tại phòng chiếu này (đã bao gồm khoảng thời gian dọn phòng của cả hai suất).'
        );
      } else if (code === 'RESOURCE_STATE_CONFLICT') {
        setFormError(
          message || 'Suất chiếu đã có lịch sử đặt vé hoặc phòng đã bị khóa; không thể sửa đổi.'
        );
      } else if (code === 'ROOM_UNAVAILABLE') {
        setFormError(
          'Phòng chiếu hoặc cụm rạp không hoạt động, hoặc phòng chưa có ghế hoạt động (ACTIVE).'
        );
      } else if (code === 'MOVIE_UNAVAILABLE') {
        setFormError('Phim đang ở trạng thái ẩn (HIDDEN), không thể tạo lịch chiếu.');
      } else if (code === 'SCHEDULE_INVALID') {
        setFormError(
          message || 'Suất chiếu không đủ thời lượng phim hoặc cấu hình giá không hợp lệ.'
        );
      } else if (fieldErrors?.length) {
        setFormError(fieldErrors.map((f: FieldErrorItem) => f.message).join(' '));
      } else {
        setFormError(message || 'Đã có lỗi xảy ra khi lưu suất chiếu. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEdit && isLoadingDetail) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isEdit && isErrorDetail) {
    return (
      <div className="py-12 space-y-4">
        <AlertMessage variant="error">Không tìm thấy suất chiếu hoặc không thể tải dữ liệu.</AlertMessage>
        <Link to="/admin/showtimes" className="text-xs text-[#e6e2c1] hover:underline inline-block">
          &larr; Quay lại danh sách suất chiếu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#20232e] pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Link to="/admin/showtimes" className="hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quản lý suất chiếu</span>
            </Link>
            <span>/</span>
            <span className="text-[#e6e2c1] font-semibold">
              {isEdit ? `Sửa suất #${numericShowtimeId}` : 'Tạo suất mới'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {isEdit ? `Chỉnh sửa Suất Chiếu #${numericShowtimeId}` : 'Tạo Suất Chiếu Mới'}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Thiết lập thời gian chiếu theo giờ Việt Nam, phòng chiếu và giá vé tồn kho
          </p>
        </div>
      </div>

      {/* Success banner after creation */}
      {createdResult && (
        <div className="bg-[#13151d] border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl shadow-black/30">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-lg font-bold text-white">Tạo suất chiếu thành công!</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Suất chiếu mã <strong>#{createdResult.showtime.id}</strong> đã được lưu thành công vào cơ sở dữ liệu.
                Hệ thống đã tự động khởi tạo tồn kho cho <strong>{createdResult.createdSeatCount} ghế hoạt động</strong> của phòng.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#242733]">
            <Link
              to={`/showtimes/${createdResult.showtime.id}/seats`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#e6e2c1] text-black text-xs font-bold rounded-full hover:brightness-110 transition-all"
            >
              <span>Kiểm tra sơ đồ ghế & tồn kho</span>
              <span className="text-xs">&rarr;</span>
            </Link>

            <Link
              to="/admin/showtimes"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a1c24] hover:bg-[#252836] text-zinc-200 text-xs font-semibold rounded-full border border-[#2b2f3e] transition-colors"
            >
              <span>Về danh sách suất chiếu</span>
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCreatedResult(null);
                setStartsAt('');
                setEndsAt('');
              }}
            >
              Tạo tiếp suất khác
            </Button>
          </div>
        </div>
      )}

      {/* Rules Notice */}
      <div className="bg-[#13151d] border border-amber-500/30 rounded-xl p-4 flex items-start gap-3.5 text-xs text-amber-200/90">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">Ràng buộc nghiệp vụ tạo & sửa suất chiếu (BR-02 / BR-20):</p>
          <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
            <li>
              <strong>Chống trùng lịch (BR-02):</strong> Hai suất chiếu trong cùng một phòng không được trùng khoảng thời gian <code>[startsAt, endsAt + cleanupMinutes)</code>.
            </li>
            <li>
              <strong>Bảo vệ lịch sử:</strong> Chỉ sửa được suất ở trạng thái <code>SCHEDULED</code> và chưa có bất kỳ booking lịch sử nào (kể cả EXPIRED hoặc CANCELLED).
            </li>
          </ul>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && <AlertMessage variant="error">{formError}</AlertMessage>}

        {/* Section 1: Film selection */}
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#20232e] pb-3">
            <Film className="w-4 h-4 text-[#e6e2c1]" />
            <span>1. Chọn Phim Chiếu</span>
          </div>

          <div>
            <label htmlFor="movieSelect" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Phim chiếu <span className="text-red-400">*</span>
            </label>
            {isLoadingMovies ? (
              <LoadingSpinner />
            ) : (
              <select
                id="movieSelect"
                value={movieId}
                onChange={(e) => setMovieId(e.target.value ? parseInt(e.target.value, 10) : '')}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
              >
                <option value="">-- Chọn phim --</option>
                {schedulableMovies.map((movie) => (
                  <option key={movie.id} value={movie.id}>
                    {movie.title} ({movie.durationMinutes} phút - {movie.status})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-zinc-500 mt-1">
              Phim ở trạng thái HIDDEN bị loại trừ khỏi danh sách lựa chọn lập lịch.
            </p>
          </div>

          {selectedMovie && (
            <div className="bg-[#090a0f] border border-[#252836] rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Thời lượng phim:</span>
              <span className="font-bold text-[#e6e2c1]">{selectedMovie.durationMinutes} phút</span>
            </div>
          )}
        </div>

        {/* Section 2: Cinema and Room selection */}
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#20232e] pb-3">
            <Tv className="w-4 h-4 text-[#e6e2c1]" />
            <span>2. Chọn Cụm Rạp & Phòng Chiếu</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cinemaSelect" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Cụm rạp <span className="text-red-400">*</span>
              </label>
              {isLoadingCinemas ? (
                <LoadingSpinner />
              ) : (
                <select
                  id="cinemaSelect"
                  value={cinemaId}
                  onChange={(e) => {
                    setCinemaId(e.target.value ? parseInt(e.target.value, 10) : '');
                    setRoomId(''); // reset room
                  }}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
                >
                  <option value="">-- Chọn rạp --</option>
                  {cinemasData?.content
                    ?.filter((c) => c.status === 'ACTIVE')
                    .map((cinema) => (
                      <option key={cinema.id} value={cinema.id}>
                        {cinema.name}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="roomSelect" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Phòng chiếu <span className="text-red-400">*</span>
              </label>
              {isLoadingRooms ? (
                <LoadingSpinner />
              ) : (
                <select
                  id="roomSelect"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value ? parseInt(e.target.value, 10) : '')}
                  required
                  disabled={!cinemaId || isSubmitting}
                  className="w-full px-4 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors disabled:opacity-40"
                >
                  <option value="">{cinemaId ? '-- Chọn phòng chiếu --' : '-- Hãy chọn rạp trước --'}</option>
                  {activeRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-zinc-500 mt-1">Chỉ hiển thị các phòng ACTIVE.</p>
            </div>
          </div>
          {needsSeatCheck && roomId && (
            <div>
              {isCheckingSeats ? (
                <p className="text-xs text-zinc-400">Đang kiểm tra ghế của phòng chiếu...</p>
              ) : isSeatsError ? (
                <AlertMessage variant="error">
                  Không thể kiểm tra ghế của phòng chiếu.{' '}
                  <button type="button" onClick={() => refetchSeats()} className="underline">Thử lại</button>
                </AlertMessage>
              ) : hasNoActiveSeats ? (
                <AlertMessage variant="warning">
                  Phòng chiếu chưa có ghế ACTIVE nên chưa thể tạo suất chiếu. Vui lòng thêm ghế hoặc chuyển ghế đang bảo trì sang ACTIVE trước.{' '}
                  <Link to={`/admin/rooms/${roomId}/seats`} className="font-semibold underline">Cấu hình ghế phòng chiếu</Link>
                </AlertMessage>
              ) : roomSeats ? (
                <p className="text-xs text-emerald-400">Phòng có {roomSeats.filter((seat) => seat.status === 'ACTIVE').length} ghế ACTIVE để khởi tạo tồn kho suất chiếu.</p>
              ) : null}
            </div>
          )}
        </div>

        {/* Section 3: Time and Cleanup */}
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#20232e] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Clock className="w-4 h-4 text-[#e6e2c1]" />
              <span>3. Thời Gian Chiếu & Dọn Phòng (Giờ Việt Nam)</span>
            </div>

            {selectedMovie && startsAt && (
              <button
                type="button"
                onClick={handleSuggestEndsAt}
                className="inline-flex items-center gap-1.5 text-xs text-[#e6e2c1] hover:underline font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gợi ý giờ kết thúc (+{selectedMovie.durationMinutes}m)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startsAtInput" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Bắt đầu chiếu <span className="text-red-400">*</span>
              </label>
              <Input
                id="startsAtInput"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-zinc-500 mt-1">Múi giờ Asia/Ho_Chi_Minh (+07:00)</p>
            </div>

            <div>
              <label htmlFor="endsAtInput" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Kết thúc chiếu <span className="text-red-400">*</span>
              </label>
              <Input
                id="endsAtInput"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-zinc-500 mt-1">Phải đủ thời lượng phim</p>
            </div>

            <div>
              <label htmlFor="cleanupInput" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Thời gian dọn phòng (phút)
              </label>
              <Input
                id="cleanupInput"
                type="number"
                min={0}
                max={65535}
                value={cleanupMinutes}
                onChange={(e) => setCleanupMinutes(parseInt(e.target.value, 10) || 0)}
                required
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-zinc-500 mt-1">Mặc định 15 phút</p>
            </div>
          </div>

          {nextAvailableTime && (
            <div className="bg-[#090a0f] border border-[#252836] rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Phòng chiếu sẵn sàng cho suất kế tiếp vào lúc:</span>
              <span className="font-bold text-sky-400">{nextAvailableTime.replace('T', ' ')}</span>
            </div>
          )}
        </div>

        {/* Section 4: Price configuration */}
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#20232e] pb-3">
            <DollarSign className="w-4 h-4 text-[#e6e2c1]" />
            <span>4. Cấu Hình Giá Vé Tồn Kho (VND)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="basePriceInput" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Giá vé cơ bản (Standard) <span className="text-red-400">*</span>
              </label>
              <Input
                id="basePriceInput"
                type="number"
                min={0}
                step="1000"
                value={basePrice}
                onChange={(e) => {
                  const val = e.target.value;
                  setBasePrice(val === '' ? '' : parseFloat(val));
                }}
                required
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Hiển thị: {typeof basePrice === 'number' ? formatCurrency(basePrice) : '0 ₫'}
              </p>
            </div>

            <div>
              <label htmlFor="vipSurchargeInput" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Phụ thu ghế VIP
              </label>
              <Input
                id="vipSurchargeInput"
                type="number"
                min={0}
                step="1000"
                value={vipSurcharge}
                onChange={(e) => {
                  const val = e.target.value;
                  setVipSurcharge(val === '' ? '' : parseFloat(val));
                }}
                required
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Tổng giá VIP: {formatCurrency((typeof basePrice === 'number' ? basePrice : 0) + (typeof vipSurcharge === 'number' ? vipSurcharge : 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link to="/admin/showtimes">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Hủy
            </Button>
          </Link>
          <Button type="submit" variant="primary" disabled={isSubmitting || isSeatCheckBlocked}>
            {isSubmitting ? 'Đang xử lý...' : isEdit ? 'Cập nhật suất chiếu' : 'Tạo suất chiếu'}
          </Button>
        </div>
      </form>
    </div>
  );
};
