import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Film,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useAdminCinemas, useAdminRooms } from '@/features/cinemas';
import { useAdminMovies } from '@/features/movies';
import {
  WEEKDAY_OPTIONS,
  addDaysToDate,
  useAdminSchedulePlanDetail,
  useCreateSchedulePlan,
  useSchedulePlanLogs,
  useUpdateSchedulePlan,
  type SchedulePlanRequest,
  type SchedulePlanStatus,
} from '@/features/schedule-plans';
import {
  AlertMessage,
  Button,
  Input,
  LoadingSpinner,
} from '@/shared/components/ui';
import { formatCurrency, getVietnamDateString } from '@/shared/utils/format';

interface SelectedMovie {
  id: number;
  title: string;
  durationMinutes: number;
  status: string;
  releaseDate: string | null;
}

const selectClass =
  'w-full px-3 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors disabled:opacity-40';

export const AdminSchedulePlanFormPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const isEdit = Boolean(planId);
  const numericPlanId = planId ? parseInt(planId, 10) : undefined;
  const today = getVietnamDateString();

  const [name, setName] = useState('');
  const [cinemaId, setCinemaId] = useState<number | ''>('');
  const [roomId, setRoomId] = useState<number | ''>('');
  const [status, setStatus] = useState<SchedulePlanStatus>('ACTIVE');
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [effectiveTo, setEffectiveTo] = useState(addDaysToDate(today, 30));
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [slotStepMinutes, setSlotStepMinutes] = useState(15);
  const [cleanupMinutes, setCleanupMinutes] = useState(15);
  const [basePrice, setBasePrice] = useState<number | ''>(75000);
  const [vipSurcharge, setVipSurcharge] = useState<number | ''>(20000);
  const [movieIds, setMovieIds] = useState<number[]>([]);
  const [movieToAdd, setMovieToAdd] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  const initializedPlanIdRef = useRef<number | null>(null);

  const {
    data: plan,
    isLoading: isLoadingPlan,
    isError: isPlanError,
  } = useAdminSchedulePlanDetail(numericPlanId);
  const { data: cinemasData } = useAdminCinemas(0, 100, 'name,asc');
  const { data: roomsData } = useAdminRooms(
    typeof cinemaId === 'number' ? cinemaId : undefined,
    0,
    100,
    'name,asc'
  );
  const { data: moviesData } = useAdminMovies({ size: 100 });
  const { data: logsData } = useSchedulePlanLogs(numericPlanId, { page: 0, size: 1 });

  const createMutation = useCreateSchedulePlan();
  const updateMutation = useUpdateSchedulePlan(numericPlanId);
  const activeMutation = isEdit ? updateMutation : createMutation;

  useEffect(() => {
    if (!plan || initializedPlanIdRef.current === plan.id) return;
    initializedPlanIdRef.current = plan.id;
    setName(plan.name);
    setCinemaId(plan.cinemaId);
    setRoomId(plan.roomId);
    setStatus(plan.status);
    setEffectiveFrom(plan.effectiveFrom);
    setEffectiveTo(plan.effectiveTo);
    setDaysOfWeek(plan.daysOfWeek);
    setOpenTime(plan.openTime);
    setCloseTime(plan.closeTime);
    setSlotStepMinutes(plan.slotStepMinutes);
    setCleanupMinutes(plan.cleanupMinutes);
    setBasePrice(plan.basePrice);
    setVipSurcharge(plan.vipSurcharge);
    setMovieIds(plan.movies.map((movie) => movie.movieId));
  }, [plan]);

  const movieById = useMemo(() => {
    const map = new Map<number, NonNullable<typeof moviesData>['content'][number]>();
    moviesData?.content.forEach((movie) => map.set(movie.id, movie));
    return map;
  }, [moviesData]);

  const selectedMovies = useMemo<SelectedMovie[]>(() => {
    return movieIds.map((id) => {
      const movie = movieById.get(id);
      const fallback = plan?.movies.find((item) => item.movieId === id);
      return {
        id,
        title: movie?.title ?? fallback?.title ?? `Phim #${id}`,
        durationMinutes: movie?.durationMinutes ?? fallback?.durationMinutes ?? 0,
        status: movie?.status ?? fallback?.status ?? '',
        releaseDate: movie?.releaseDate ?? fallback?.releaseDate ?? null,
      };
    });
  }, [movieIds, movieById, plan]);

  const pendingMovie = movieToAdd ? movieById.get(Number(movieToAdd)) : undefined;
  const hasHiddenSelected = selectedMovies.some((movie) => movie.status === 'HIDDEN');

  const slotStepOptions = (() => {
    const values = [15, 30, 45, 60];
    if (plan?.slotStepMinutes && !values.includes(plan.slotStepMinutes)) {
      values.push(plan.slotStepMinutes);
    }
    return [...values].sort((a, b) => a - b);
  })();

  const toggleDay = (value: number) => {
    setDaysOfWeek((current) =>
      current.includes(value)
        ? current.filter((day) => day !== value)
        : [...current, value].sort((a, b) => a - b)
    );
  };

  const addMovie = () => {
    if (!movieToAdd) return;
    const id = Number(movieToAdd);
    if (movieIds.includes(id)) {
      setFormError('Phim đã có trong danh sách ưu tiên.');
      return;
    }
    if (movieById.get(id)?.status === 'HIDDEN') {
      setFormError('Phim đang ẩn, không thể xếp lịch.');
      return;
    }
    setMovieIds((current) => [...current, id]);
    setMovieToAdd('');
    setFormError(null);
  };

  const moveMovie = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= movieIds.length) return;
    setMovieIds((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeMovie = (id: number) => {
    setMovieIds((current) => current.filter((movieId) => movieId !== id));
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Tên kế hoạch là bắt buộc.';
    if (!cinemaId) return 'Vui lòng chọn cụm rạp.';
    if (!roomId) return 'Vui lòng chọn phòng chiếu.';
    if (!effectiveFrom || !effectiveTo) return 'Vui lòng chọn khoảng ngày hiệu lực.';
    if (effectiveTo < effectiveFrom) return 'Ngày kết thúc hiệu lực phải sau hoặc bằng ngày bắt đầu.';
    if (daysOfWeek.length === 0) return 'Phải chọn ít nhất một thứ trong tuần.';
    if (!openTime || !closeTime) return 'Vui lòng chọn giờ mở và giờ đóng cửa.';
    if (closeTime <= openTime) return 'Giờ đóng cửa phải sau giờ mở cửa.';
    if (!Number.isFinite(slotStepMinutes) || slotStepMinutes < 5) return 'Bước slot tối thiểu 5 phút.';
    if (slotStepMinutes > 120) return 'Bước slot tối đa 120 phút.';
    if (!Number.isFinite(cleanupMinutes) || cleanupMinutes < 0 || cleanupMinutes > 240)
      return 'Thời gian dọn phòng phải từ 0 đến 240 phút.';
    if (basePrice === '' || Number(basePrice) < 0) return 'Giá vé cơ bản không được âm.';
    if (vipSurcharge === '' || Number(vipSurcharge) < 0) return 'Phụ phí VIP không được âm.';
    if (Number(basePrice) + Number(vipSurcharge) > 9_999_999_999.99)
      return 'Tổng giá vé và phụ phí vượt giới hạn cho phép.';
    if (movieIds.length === 0) return 'Phải chọn ít nhất một phim.';
    const hidden = selectedMovies.find((movie) => movie.status === 'HIDDEN');
    if (hidden) return `Phim "${hidden.title}" đang ẩn, không thể xếp lịch. Hãy bỏ phim này.`;
    return null;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (activeMutation.isPending) return;

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload: SchedulePlanRequest = {
      name: name.trim(),
      roomId: Number(roomId),
      effectiveFrom,
      effectiveTo,
      daysOfWeek,
      openTime,
      closeTime,
      slotStepMinutes,
      cleanupMinutes,
      basePrice: Number(basePrice),
      vipSurcharge: Number(vipSurcharge),
      movieIds,
      status,
    };

    setFormError(null);
    activeMutation.mutate(payload, {
      onSuccess: () => navigate('/admin/schedule-plans'),
    });
  };

  if (isEdit && isLoadingPlan) {
    return (
      <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-16 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isEdit && isPlanError) {
    return (
      <div className="space-y-4">
        <AlertMessage variant="error">Không thể tải kế hoạch lịch tự động.</AlertMessage>
        <Link to="/admin/schedule-plans">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Quay lại danh sách
          </Button>
        </Link>
      </div>
    );
  }

  const mutationError = activeMutation.error?.message;

  return (
    <div className="space-y-6 pb-16">
      <div className="border-b border-[#20232e] pb-6">
        <Link
          to="/admin/schedule-plans"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-[#e6e2c1] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại danh sách
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          {isEdit ? 'Sửa lịch tự động' : 'Thêm lịch tự động'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Cấu hình khung giờ, thứ trong tuần và thứ tự ưu tiên phim cho một phòng chiếu.
        </p>
      </div>

      {isEdit && (logsData?.totalElements ?? 0) > 0 && (
        <AlertMessage variant="info" title="Kế hoạch đã có nhật ký sinh lịch">
          Thay đổi chỉ áp dụng cho các ngày chưa sinh. Suất đã sinh không bị sửa hoặc xóa.
        </AlertMessage>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider">
            1. Thông tin chung
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="planName"
              label="Tên kế hoạch"
              value={name}
              maxLength={150}
              aria-required="true"
              placeholder="Ví dụ: Lịch tối phòng 1"
              onChange={(event) => setName(event.target.value)}
            />

            <div>
              <label
                htmlFor="planStatus"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
              >
                Trạng thái
              </label>
              <select
                id="planStatus"
                value={status}
                onChange={(event) => setStatus(event.target.value as SchedulePlanStatus)}
                className={selectClass}
              >
                <option value="ACTIVE">Đang bật</option>
                <option value="INACTIVE">Tạm dừng</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="planCinema"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
              >
                Cụm rạp
              </label>
              <select
                id="planCinema"
                value={cinemaId}
                aria-required="true"
                onChange={(event) => {
                  const value = event.target.value;
                  setCinemaId(value ? Number(value) : '');
                  setRoomId('');
                }}
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

            <div>
              <label
                htmlFor="planRoom"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
              >
                Phòng chiếu
              </label>
              <select
                id="planRoom"
                value={roomId}
                aria-required="true"
                disabled={!cinemaId}
                onChange={(event) => setRoomId(event.target.value ? Number(event.target.value) : '')}
                className={selectClass}
              >
                <option value="">{cinemaId ? 'Chọn phòng chiếu' : 'Chọn rạp trước'}</option>
                {roomsData?.content.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider">
            2. Thời gian và khung giờ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              id="planEffectiveFrom"
              type="date"
              label="Từ ngày"
              value={effectiveFrom}
              aria-required="true"
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
            <Input
              id="planEffectiveTo"
              type="date"
              label="Đến ngày"
              value={effectiveTo}
              min={effectiveFrom}
              aria-required="true"
              onChange={(event) => setEffectiveTo(event.target.value)}
            />
            <Input
              id="planOpenTime"
              type="time"
              label="Giờ mở cửa"
              value={openTime}
              aria-required="true"
              onChange={(event) => setOpenTime(event.target.value)}
            />
            <Input
              id="planCloseTime"
              type="time"
              label="Giờ đóng cửa"
              value={closeTime}
              aria-required="true"
              onChange={(event) => setCloseTime(event.target.value)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="planSlotStep"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
              >
                Bước slot
              </label>
              <select
                id="planSlotStep"
                value={slotStepMinutes}
                onChange={(event) => setSlotStepMinutes(Number(event.target.value))}
                className={selectClass}
              >
                {slotStepOptions.map((value) => (
                  <option key={value} value={value}>
                    {value} phút
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="planCleanup"
              type="number"
              label="Dọn phòng (phút)"
              min={0}
              max={240}
              value={cleanupMinutes}
              onChange={(event) => setCleanupMinutes(Number(event.target.value))}
            />
          </div>
        </section>

        <section className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#e6e2c1] uppercase tracking-wider">
            3. Phim và giá vé
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="planBasePrice"
              type="number"
              label="Giá cơ bản (VND)"
              min={0}
              step={1000}
              value={basePrice}
              onChange={(event) =>
                setBasePrice(event.target.value === '' ? '' : Number(event.target.value))
              }
            />
            <Input
              id="planVipSurcharge"
              type="number"
              label="Phụ phí VIP (VND)"
              min={0}
              step={1000}
              value={vipSurcharge}
              onChange={(event) =>
                setVipSurcharge(event.target.value === '' ? '' : Number(event.target.value))
              }
            />
          </div>

          <div className="rounded-2xl border border-[#242733] bg-[#0c0d12] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label
                  htmlFor="planMovieToAdd"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                >
                  Thêm phim
                </label>
                <select
                  id="planMovieToAdd"
                  value={movieToAdd}
                  onChange={(event) =>
                    setMovieToAdd(event.target.value ? Number(event.target.value) : '')
                  }
                  className={selectClass}
                >
                  <option value="">Chọn phim để thêm</option>
                  {moviesData?.content.map((movie) => (
                    <option key={movie.id} value={movie.id} disabled={movieIds.includes(movie.id)}>
                      {movie.title} ({movie.durationMinutes} phút)
                      {movie.status === 'HIDDEN' ? ' - đang ẩn' : ''}
                      {movieIds.includes(movie.id) ? ' - đã thêm' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addMovie}
                disabled={
                  !movieToAdd ||
                  movieIds.includes(Number(movieToAdd)) ||
                  pendingMovie?.status === 'HIDDEN'
                }
                className="flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Thêm vào danh sách
              </Button>
            </div>

            {pendingMovie && (pendingMovie.status === 'HIDDEN' || pendingMovie.status === 'ENDED') && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {pendingMovie.status === 'HIDDEN'
                  ? 'Phim đang ẩn nên không thể thêm vào kế hoạch.'
                  : 'Phim đã kết thúc; chỉ các ngày trước khi kết thúc mới được xếp.'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Thứ tự ưu tiên ({selectedMovies.length})
              </p>
              <span className="text-[11px] text-zinc-500">Phim đầu tiên được xếp trước</span>
            </div>

            {selectedMovies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2b2f3e] px-4 py-8 text-center">
                <Film className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">
                  Chưa có phim nào. Chọn phim ở trên để thêm vào kế hoạch.
                </p>
              </div>
            ) : (
              <ol className="space-y-2">
                {selectedMovies.map((movie, index) => (
                  <li
                    key={movie.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#242733] bg-[#0c0d12] px-4 py-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e6e2c1] text-black text-xs font-black">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{movie.title}</p>
                      <p className="text-[11px] text-zinc-400">
                        {movie.durationMinutes} phút · {movie.status || 'Chưa rõ'}
                        {movie.releaseDate ? ` · khởi chiếu ${movie.releaseDate}` : ''}
                      </p>
                      {movie.status === 'HIDDEN' && (
                        <p className="text-[11px] text-amber-300 mt-1">
                          Phim đang ẩn, cần bỏ khỏi kế hoạch trước khi lưu.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => moveMovie(index, -1)}
                        disabled={index === 0}
                        aria-label={`Đưa ${movie.title} lên`}
                        className="p-2 rounded-lg bg-[#1a1c24] text-zinc-300 hover:text-white border border-[#2b2f3e] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMovie(index, 1)}
                        disabled={index === selectedMovies.length - 1}
                        aria-label={`Đưa ${movie.title} xuống`}
                        className="p-2 rounded-lg bg-[#1a1c24] text-zinc-300 hover:text-white border border-[#2b2f3e] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMovie(movie.id)}
                        aria-label={`Xóa ${movie.title}`}
                        className="p-2 rounded-lg bg-red-950/30 text-red-300 hover:text-red-200 border border-red-900/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <p className="text-[11px] text-zinc-500">
            Giá cơ bản {basePrice === '' ? '—' : formatCurrency(Number(basePrice))} · phụ phí VIP{' '}
            {vipSurcharge === '' ? '—' : formatCurrency(Number(vipSurcharge))}
          </p>
        </section>

        {(formError || mutationError || hasHiddenSelected) && (
          <AlertMessage variant="error">
            {formError ||
              mutationError ||
              'Danh sách phim còn phim đang ẩn. Hãy bỏ phim đó trước khi lưu.'}
          </AlertMessage>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <Link to="/admin/schedule-plans">
            <Button variant="ghost" type="button">
              Hủy
            </Button>
          </Link>
          <Button
            variant="primary"
            type="submit"
            isLoading={activeMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isEdit ? 'Lưu thay đổi' : 'Tạo kế hoạch'}
          </Button>
        </div>
      </form>
    </div>
  );
};
