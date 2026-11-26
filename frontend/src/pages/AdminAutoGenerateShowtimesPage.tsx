import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  Film,
  Search,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { useAdminCinemas, useAdminRooms } from '@/features/cinemas';
import { useAdminMovies } from '@/features/movies';
import {
  WEEKDAY_OPTIONS,
  addDaysToDate,
  daysBetweenInclusive,
  useAutoGenerateShowtimes,
  usePreviewAutoGenerateShowtimes,
  type BatchAutoGenerateShowtimesRequest,
  type BatchAutoGenerateShowtimesResponse,
} from '@/features/showtimes';
import {
  AlertMessage,
  Button,
  Input,
  StatusBadge,
} from '@/shared/components/ui';
import {
  formatCurrency,
  formatDate,
  formatTime,
  getVietnamDateString,
} from '@/shared/utils/format';

const selectClass =
  'w-full px-3 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors disabled:opacity-40';

export const AdminAutoGenerateShowtimesPage: React.FC = () => {
  const today = getVietnamDateString();

  const [cinemaId, setCinemaId] = useState<number | ''>('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [selectedMovieIds, setSelectedMovieIds] = useState<number[]>([]);
  const [movieSearch, setMovieSearch] = useState('');
  const [movieStatusFilter, setMovieStatusFilter] = useState<'ALL' | 'SHOWING' | 'UPCOMING'>('ALL');

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDaysToDate(today, 6));
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [slotStepMinutes, setSlotStepMinutes] = useState(15);
  const [cleanupMinutes, setCleanupMinutes] = useState(15);
  const [staggerMinutes, setStaggerMinutes] = useState(15);
  const [basePrice, setBasePrice] = useState<number | ''>(75000);
  const [vipSurcharge, setVipSurcharge] = useState<number | ''>(20000);

  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchAutoGenerateShowtimesResponse | null>(null);

  const {
    data: cinemasData,
    isError: isCinemasError,
    error: cinemasError,
    refetch: refetchCinemas,
  } = useAdminCinemas(0, 100, 'name,asc');
  const {
    data: roomsData,
    isLoading: isLoadingRooms,
    isError: isRoomsError,
    error: roomsError,
    refetch: refetchRooms,
  } = useAdminRooms(
    typeof cinemaId === 'number' ? cinemaId : undefined,
    0,
    100,
    'name,asc'
  );
  const {
    data: moviesData,
    isLoading: isLoadingMovies,
    isError: isMoviesError,
    error: moviesError,
    refetch: refetchMovies,
  } = useAdminMovies({ size: 100 });

  const previewMutation = usePreviewAutoGenerateShowtimes();
  const generateMutation = useAutoGenerateShowtimes();

  const rooms = useMemo(() => roomsData?.content ?? [], [roomsData]);
  const activeRooms = useMemo(() => rooms.filter((room) => room.status === 'ACTIVE'), [rooms]);

  const availableMovies = useMemo(() => {
    const list = (moviesData?.content ?? []).filter(
      (movie) => movie.status !== 'HIDDEN' && movie.status !== 'ENDED'
    );
    const keyword = movieSearch.trim().toLowerCase();
    return list.filter((movie) => {
      if (movieStatusFilter !== 'ALL' && movie.status !== movieStatusFilter) return false;
      if (keyword && !movie.title.toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [moviesData, movieSearch, movieStatusFilter]);

  const movieById = useMemo(() => {
    const map = new Map<number, NonNullable<typeof moviesData>['content'][number]>();
    (moviesData?.content ?? []).forEach((movie) => map.set(movie.id, movie));
    return map;
  }, [moviesData]);

  const selectedMovies = useMemo(
    () =>
      selectedMovieIds
        .map((id) => movieById.get(id))
        .filter((movie): movie is NonNullable<typeof movie> => Boolean(movie)),
    [selectedMovieIds, movieById]
  );

  const handleCinemaChange = (value: string) => {
    setCinemaId(value ? Number(value) : '');
    setSelectedRoomIds([]);
    setResult(null);
    setFormError(null);
  };

  const toggleRoom = (roomId: number) => {
    setSelectedRoomIds((current) =>
      current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId]
    );
    setResult(null);
  };

  const selectAllActiveRooms = () => {
    setSelectedRoomIds(activeRooms.map((room) => room.id));
    setResult(null);
  };

  const clearSelectedRooms = () => {
    setSelectedRoomIds([]);
    setResult(null);
  };

  const toggleMovie = (movieId: number) => {
    setSelectedMovieIds((current) =>
      current.includes(movieId) ? current.filter((id) => id !== movieId) : [...current, movieId]
    );
    setResult(null);
  };

  const moveMovie = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedMovieIds.length) return;
    setSelectedMovieIds((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b)
    );
    setResult(null);
  };

  const validateAndBuildPayload = (): BatchAutoGenerateShowtimesRequest | null => {
    if (!cinemaId) {
      setFormError('Vui lòng chọn cụm rạp.');
      return null;
    }
    if (selectedRoomIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất một phòng chiếu.');
      return null;
    }
    if (selectedMovieIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất một phim.');
      return null;
    }
    if (!from || !to) {
      setFormError('Vui lòng chọn khoảng ngày tạo suất.');
      return null;
    }
    if (to < from) {
      setFormError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
      return null;
    }
    if (from < today) {
      setFormError('Ngày bắt đầu không được trước hôm nay.');
      return null;
    }
    if (daysBetweenInclusive(from, to) > 31) {
      setFormError('Chỉ tạo tối đa 31 ngày mỗi lần.');
      return null;
    }
    if (daysOfWeek.length === 0) {
      setFormError('Phải chọn ít nhất một thứ trong tuần.');
      return null;
    }
    if (!openTime || !closeTime || closeTime <= openTime) {
      setFormError('Giờ đóng cửa phải sau giờ mở cửa.');
      return null;
    }
    if (!Number.isFinite(slotStepMinutes) || slotStepMinutes < 5 || slotStepMinutes > 120) {
      setFormError('Bước slot phải từ 5 đến 120 phút.');
      return null;
    }
    if (!Number.isFinite(cleanupMinutes) || cleanupMinutes < 0 || cleanupMinutes > 240) {
      setFormError('Thời gian dọn phòng phải từ 0 đến 240 phút.');
      return null;
    }
    if (!Number.isFinite(staggerMinutes) || staggerMinutes < 0 || staggerMinutes > 120) {
      setFormError('Độ lệch giờ giữa các phòng phải từ 0 đến 120 phút.');
      return null;
    }
    if (basePrice === '' || Number(basePrice) < 0) {
      setFormError('Giá vé cơ bản không được âm.');
      return null;
    }
    if (vipSurcharge === '' || Number(vipSurcharge) < 0) {
      setFormError('Phụ phí VIP không được âm.');
      return null;
    }

    setFormError(null);
    return {
      cinemaId: Number(cinemaId),
      roomIds: selectedRoomIds,
      movieIds: selectedMovieIds,
      from,
      to,
      daysOfWeek,
      openTime,
      closeTime,
      slotStepMinutes,
      cleanupMinutes,
      staggerMinutes,
      basePrice: Number(basePrice),
      vipSurcharge: Number(vipSurcharge),
    };
  };

  const handlePreview = () => {
    if (previewMutation.isPending || generateMutation.isPending) return;
    const payload = validateAndBuildPayload();
    if (!payload) return;
    previewMutation.mutate(payload, {
      onSuccess: (data) => setResult(data),
    });
  };

  const handleGenerate = (event: React.FormEvent) => {
    event.preventDefault();
    if (previewMutation.isPending || generateMutation.isPending) return;
    const payload = validateAndBuildPayload();
    if (!payload) return;
    generateMutation.mutate(payload, {
      onSuccess: (data) => setResult(data),
    });
  };

  const apiError = generateMutation.error?.message || previewMutation.error?.message;

  return (
    <div className="space-y-6 pb-16">
      <div className="border-b border-[#20232e] pb-6">
        <Link
          to="/admin/showtimes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-[#e6e2c1] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại danh sách suất chiếu
        </Link>
        <div className="flex items-center gap-2 text-[#e6e2c1] text-sm font-bold mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Tạo suất chiếu tự động</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Tạo suất chiếu tự động theo rạp &amp; nhiều phòng
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Chọn cụm rạp, các phòng chiếu và danh sách phim để hệ thống tự phân bổ suất chiếu ngay — không cần đặt tên kế hoạch.
        </p>
      </div>

      <form onSubmit={handleGenerate} noValidate className="space-y-6">
        {/* 1. Cinema & Rooms */}
        <section className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider">
              1. Chọn rạp và phòng chiếu
            </h2>
            {cinemaId && activeRooms.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllActiveRooms}
                  className="text-xs font-semibold text-[#e6e2c1] hover:underline cursor-pointer"
                >
                  Chọn tất cả phòng hoạt động ({activeRooms.length})
                </button>
                {selectedRoomIds.length > 0 && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <button
                      type="button"
                      onClick={clearSelectedRooms}
                      className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="max-w-md">
            <label
              htmlFor="autoGenCinema"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
            >
              Cụm rạp
            </label>
            <select
              id="autoGenCinema"
              value={cinemaId}
              onChange={(event) => handleCinemaChange(event.target.value)}
              className={selectClass}
            >
              <option value="">Chọn cụm rạp</option>
              {cinemasData?.content.map((cinema) => (
                <option key={cinema.id} value={cinema.id}>
                  {cinema.name}
                </option>
              ))}
            </select>
          </div>

          {isCinemasError && (
            <div className="space-y-2">
              <AlertMessage variant="error">
                {cinemasError?.message || 'Không thể tải danh sách cụm rạp.'}
              </AlertMessage>
              <Button type="button" variant="outline" size="sm" onClick={() => refetchCinemas()}>
                Thử lại
              </Button>
            </div>
          )}

          {cinemaId ? (
            isLoadingRooms ? (
              <p className="text-xs text-zinc-400">Đang tải danh sách phòng chiếu...</p>
            ) : isRoomsError ? (
              <div className="space-y-2">
                <AlertMessage variant="error">
                  {roomsError?.message || 'Không thể tải danh sách phòng chiếu.'}
                </AlertMessage>
                <Button type="button" variant="outline" size="sm" onClick={() => refetchRooms()}>
                  Thử lại
                </Button>
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-xs text-zinc-500">Cụm rạp này chưa có phòng chiếu nào.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rooms.map((room) => {
                  const checked = selectedRoomIds.includes(room.id);
                  const disabled = room.status !== 'ACTIVE';
                  return (
                    <button
                      key={room.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={disabled}
                      onClick={() => toggleRoom(room.id)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        disabled
                          ? 'border-[#1f222d] bg-[#0a0b10] opacity-50 cursor-not-allowed'
                          : checked
                          ? 'border-[#e6e2c1] bg-[#e6e2c1]/10 cursor-pointer'
                          : 'border-[#252836] bg-[#090a0f] hover:border-[#3a3f52] cursor-pointer'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-[#e6e2c1] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-500 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{room.name}</p>
                        <p className="text-[11px] text-zinc-400">
                          {room.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <p className="text-xs text-zinc-500">Chọn cụm rạp trước để chọn nhiều phòng chiếu.</p>
          )}
        </section>

        {/* 2. Movies */}
        <section className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider">
              2. Chọn các phim cần xếp lịch ({selectedMovieIds.length} đã chọn)
            </h2>
            <span className="text-[11px] text-zinc-500">
              Hệ thống tự xoay thứ tự phim giữa các phòng để tránh trùng giờ chiếu
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={movieSearch}
                onChange={(event) => setMovieSearch(event.target.value)}
                placeholder="Tìm phim theo tên..."
                aria-label="Tìm phim theo tên"
                className="w-full pl-9 pr-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1]"
              />
            </div>

            <select
              aria-label="Lọc trạng thái phim"
              value={movieStatusFilter}
              onChange={(event) =>
                setMovieStatusFilter(event.target.value as 'ALL' | 'SHOWING' | 'UPCOMING')
              }
              className="sm:w-48 px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1]"
            >
              <option value="ALL">Đang chiếu &amp; Sắp chiếu</option>
              <option value="SHOWING">Chỉ phim đang chiếu</option>
              <option value="UPCOMING">Chỉ phim sắp chiếu</option>
            </select>
          </div>

          {isLoadingMovies ? (
            <p className="text-xs text-zinc-400">Đang tải danh sách phim...</p>
          ) : isMoviesError ? (
            <div className="space-y-2">
              <AlertMessage variant="error">
                {moviesError?.message || 'Không thể tải danh sách phim.'}
              </AlertMessage>
              <Button type="button" variant="outline" size="sm" onClick={() => refetchMovies()}>
                Thử lại
              </Button>
            </div>
          ) : availableMovies.length === 0 ? (
            <p className="text-xs text-zinc-500">Không tìm thấy phim phù hợp.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1 [overflow-anchor:none]">
              {availableMovies.map((movie) => {
                const checked = selectedMovieIds.includes(movie.id);
                return (
                  <button
                    key={movie.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleMovie(movie.id)}
                    className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left cursor-pointer transition-colors ${
                      checked
                        ? 'border-zinc-500 bg-zinc-400/10'
                        : 'border-[#252836] bg-[#090a0f] hover:border-[#3a3f52]'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{movie.title}</p>
                      <p className="text-[11px] text-zinc-400">
                        {movie.durationMinutes} phút ·{' '}
                        {movie.status === 'SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected movies priority list */}
          <div className="space-y-2 pt-2 border-t border-[#20232e]">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Thứ tự ưu tiên phim ({selectedMovies.length})
            </p>
            {selectedMovies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2b2f3e] px-4 py-6 text-center">
                <Film className="w-7 h-7 text-zinc-600 mx-auto mb-1.5" />
                <p className="text-xs text-zinc-500">Tick chọn ít nhất một phim ở danh sách trên.</p>
              </div>
            ) : (
              <ol className="space-y-2">
                {selectedMovies.map((movie, index) => (
                  <li
                    key={movie.id}
                    className="flex items-center gap-3 rounded-xl border border-[#242733] bg-[#0c0d12] px-4 py-2.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e6e2c1] text-black text-xs font-black">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{movie.title}</p>
                      <p className="text-[11px] text-zinc-400">
                        {movie.durationMinutes} phút
                        {movie.releaseDate ? ` · khởi chiếu ${movie.releaseDate}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveMovie(index, -1)}
                        disabled={index === 0}
                        aria-label={`Đưa ${movie.title} lên`}
                        className="p-1.5 rounded-lg bg-[#1a1c24] text-zinc-300 hover:text-white border border-[#2b2f3e] disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMovie(index, 1)}
                        disabled={index === selectedMovies.length - 1}
                        aria-label={`Đưa ${movie.title} xuống`}
                        className="p-1.5 rounded-lg bg-[#1a1c24] text-zinc-300 hover:text-white border border-[#2b2f3e] disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleMovie(movie.id)}
                        aria-label={`Bỏ chọn ${movie.title}`}
                        className="p-1.5 rounded-lg bg-red-950/30 text-red-300 hover:text-red-200 border border-red-900/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* 3. Schedule & Pricing */}
        <section className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider">
            3. Thời gian, khung giờ &amp; giá vé
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              id="autoGenFrom"
              type="date"
              label="Từ ngày"
              value={from}
              min={today}
              onChange={(event) => {
                setFrom(event.target.value);
                setResult(null);
              }}
            />
            <Input
              id="autoGenTo"
              type="date"
              label="Đến ngày"
              value={to}
              min={from || today}
              onChange={(event) => {
                setTo(event.target.value);
                setResult(null);
              }}
            />
            <Input
              id="autoGenOpenTime"
              type="time"
              label="Giờ mở cửa"
              value={openTime}
              onChange={(event) => {
                setOpenTime(event.target.value);
                setResult(null);
              }}
            />
            <Input
              id="autoGenCloseTime"
              type="time"
              label="Giờ đóng cửa"
              value={closeTime}
              onChange={(event) => {
                setCloseTime(event.target.value);
                setResult(null);
              }}
            />
          </div>

          <div>
            <p className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
              Thứ trong tuần
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((option) => {
                const selected = daysOfWeek.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={option.label}
                    onClick={() => toggleDay(option.value)}
                    className={`min-w-14 px-3 py-2 rounded-xl border text-center transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#e6e2c1] text-black border-[#e6e2c1]'
                        : 'bg-[#090a0f] text-zinc-300 border-[#252836] hover:border-[#3a3f52]'
                    }`}
                  >
                    <span className="block text-sm font-bold">{option.short}</span>
                    <span className="block text-[10px] opacity-80">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="autoGenSlotStep"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
              >
                Bước slot
              </label>
              <select
                id="autoGenSlotStep"
                value={slotStepMinutes}
                onChange={(event) => {
                  setSlotStepMinutes(Number(event.target.value));
                  setResult(null);
                }}
                className={selectClass}
              >
                {[15, 30, 45, 60].map((val) => (
                  <option key={val} value={val}>
                    {val} phút
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="autoGenCleanup"
              type="number"
              label="Dọn phòng (phút)"
              min={0}
              max={240}
              value={cleanupMinutes}
              onChange={(event) => {
                setCleanupMinutes(Number(event.target.value));
                setResult(null);
              }}
            />

            <div>
              <label
                htmlFor="autoGenStagger"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
              >
                Lệch giờ giữa các phòng
              </label>
              <select
                id="autoGenStagger"
                value={staggerMinutes}
                onChange={(event) => {
                  setStaggerMinutes(Number(event.target.value));
                  setResult(null);
                }}
                className={selectClass}
              >
                {[0, 15, 30, 45, 60].map((val) => (
                  <option key={val} value={val}>
                    {val === 0 ? 'Không lệch (0 phút)' : `Lệch ${val} phút`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="autoGenBasePrice"
              type="number"
              label="Giá cơ bản (VND)"
              min={0}
              step={1000}
              value={basePrice}
              onChange={(event) => {
                setBasePrice(event.target.value === '' ? '' : Number(event.target.value));
                setResult(null);
              }}
            />
            <Input
              id="autoGenVipSurcharge"
              type="number"
              label="Phụ phí VIP (VND)"
              min={0}
              step={1000}
              value={vipSurcharge}
              onChange={(event) => {
                setVipSurcharge(event.target.value === '' ? '' : Number(event.target.value));
                setResult(null);
              }}
            />
          </div>

          <p className="text-[11px] text-zinc-500">
            Giá cơ bản {basePrice === '' ? '—' : formatCurrency(Number(basePrice))} · phụ phí VIP{' '}
            {vipSurcharge === '' ? '—' : formatCurrency(Number(vipSurcharge))} · Chỉ bổ sung khung trống, không ghi đè suất đã có.
          </p>
        </section>

        {(formError || apiError) && (
          <AlertMessage variant="error">{formError || apiError}</AlertMessage>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            isLoading={previewMutation.isPending}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Xem trước lịch chiếu
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={generateMutation.isPending}
            disabled={previewMutation.isPending}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Tạo suất chiếu ngay
          </Button>
        </div>
      </form>

      {/* Preview / Generation Result */}
      {result && (
        <section className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">
                {result.preview ? 'Xem trước lịch chiếu dự kiến' : 'Kết quả tạo suất chiếu'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {result.cinemaName} · {formatDate(result.from)} - {formatDate(result.to)} ·{' '}
                {result.rooms.length} phòng
              </p>
            </div>

            {!result.preview && (
              <Link
                to={`/admin/showtimes?cinemaId=${result.cinemaId}&date=${result.from}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1a1c24] hover:bg-[#252836] text-[#e6e2c1] text-xs font-semibold rounded-xl border border-[#2b2f3e] transition-colors"
              >
                Xem danh sách suất chiếu
              </Link>
            )}
          </div>

          <AlertMessage
            variant={
              result.preview
                ? 'info'
                : result.totalFailedCount > 0
                ? 'warning'
                : result.totalCreatedCount > 0
                ? 'success'
                : 'warning'
            }
          >
            {result.preview
              ? `Dự kiến tạo ${result.totalPlannedCount} suất chiếu trên ${result.rooms.length} phòng.`
              : `Đã tạo ${result.totalCreatedCount} suất chiếu, bỏ qua ${result.totalSkippedCount} khung, lỗi ${result.totalFailedCount} ngày.`}
          </AlertMessage>

          <div className="space-y-4">
            {result.rooms.map((room) => (
              <div
                key={room.roomId}
                className="rounded-xl border border-[#242733] bg-[#0c0d12] overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-[#1e202a] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{room.roomName}</span>
                  <span className="text-xs text-zinc-400">
                    {result.preview
                      ? `Dự kiến ${room.plannedCount} suất`
                      : `Đã tạo ${room.createdCount} · Bỏ qua ${room.skippedCount}`}
                  </span>
                </div>

                <div className="divide-y divide-[#1e202a]">
                  {room.dates.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-zinc-500">
                      Không có ngày nào khớp thứ đã chọn.
                    </p>
                  ) : (
                    room.dates.map((day) => (
                      <div key={day.date} className="px-4 py-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-200">
                              {formatDate(day.date)}
                            </span>
                            <StatusBadge status={day.outcome} />
                          </div>
                          <span className="text-xs text-zinc-400">{day.message}</span>
                        </div>

                        {day.showtimes.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {day.showtimes.map((slot, idx) => (
                              <span
                                key={`${slot.movieId}-${slot.startsAt}-${idx}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[#252836] bg-[#13151d] px-2.5 py-1 text-[11px] text-zinc-200"
                              >
                                <span className="font-mono font-bold text-[#e6e2c1]">
                                  {formatTime(slot.startsAt)}-{formatTime(slot.endsAt)}
                                </span>
                                <span className="truncate max-w-44">{slot.movieTitle}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
