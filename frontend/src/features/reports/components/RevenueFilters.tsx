import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
import type { Cinema } from '@/features/cinemas';
import type { Movie } from '@/features/movies';
import { AlertMessage, Button } from '@/shared/components/ui';
import type { QuickRange, RevenueFilterErrors, RevenueFilterInput } from '../utils/report-filters';

export interface RevenueFiltersProps {
  draft: RevenueFilterInput;
  errors: RevenueFilterErrors;
  cinemas: Cinema[];
  movies: Movie[];
  cinemasLoading: boolean;
  moviesLoading: boolean;
  cinemasError: boolean;
  moviesError: boolean;
  onRetryCinemas: () => void;
  onRetryMovies: () => void;
  hasMoreCinemas: boolean;
  hasMoreMovies: boolean;
  onLoadMoreCinemas: () => void;
  onLoadMoreMovies: () => void;
  movieKeyword: string;
  onMovieKeywordChange: (value: string) => void;
  onMovieSearch: () => void;
  onDraftChange: (patch: Partial<RevenueFilterInput>) => void;
  onApply: () => void;
  onReset: () => void;
  onQuickRange: (kind: QuickRange) => void;
  isDirty: boolean;
  disabled?: boolean;
}

const fieldClass =
  'w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors disabled:opacity-40';
const labelClass = 'block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5';
const errorClass = 'mt-1 text-[11px] font-semibold text-red-400';

const quickRanges: { kind: QuickRange; label: string }[] = [
  { kind: 'today', label: 'Hôm nay' },
  { kind: 'last7', label: '7 ngày gần nhất' },
  { kind: 'thisMonth', label: 'Tháng này' },
  { kind: 'lastMonth', label: 'Tháng trước' },
];

export const RevenueFiltersPanel: React.FC<RevenueFiltersProps> = ({
  draft,
  errors,
  cinemas,
  movies,
  cinemasLoading,
  moviesLoading,
  cinemasError,
  moviesError,
  onRetryCinemas,
  onRetryMovies,
  hasMoreCinemas,
  hasMoreMovies,
  onLoadMoreCinemas,
  onLoadMoreMovies,
  movieKeyword,
  onMovieKeywordChange,
  onMovieSearch,
  onDraftChange,
  onApply,
  onReset,
  onQuickRange,
  isDirty,
  disabled = false,
}) => {
  return (
    <section
      aria-labelledby="revenueFilterHeading"
      className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
          <Filter className="w-4 h-4 text-[#e6e2c1]" />
          <h2 id="revenueFilterHeading">Bộ lọc báo cáo</h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs text-[#e6e2c1] hover:underline font-semibold cursor-pointer disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div>
          <label htmlFor="revenueFrom" className={labelClass}>
            Từ ngày
          </label>
          <input
            id="revenueFrom"
            type="date"
            value={draft.from}
            onChange={(event) => onDraftChange({ from: event.target.value })}
            aria-invalid={Boolean(errors.from)}
            aria-describedby={errors.from ? 'revenueFromError' : undefined}
            disabled={disabled}
            className={fieldClass}
          />
          {errors.from && (
            <p id="revenueFromError" className={errorClass}>
              {errors.from}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="revenueTo" className={labelClass}>
            Đến ngày
          </label>
          <input
            id="revenueTo"
            type="date"
            value={draft.to}
            onChange={(event) => onDraftChange({ to: event.target.value })}
            aria-invalid={Boolean(errors.to)}
            aria-describedby={errors.to ? 'revenueToError' : undefined}
            disabled={disabled}
            className={fieldClass}
          />
          {errors.to && (
            <p id="revenueToError" className={errorClass}>
              {errors.to}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="revenueCinema" className={labelClass}>
            Rạp
          </label>
          <select
            id="revenueCinema"
            value={draft.cinemaId}
            onChange={(event) => onDraftChange({ cinemaId: event.target.value })}
            aria-invalid={Boolean(errors.cinemaId)}
            disabled={disabled}
            className={fieldClass}
          >
            <option value="">Tất cả rạp</option>
            {cinemas.map((cinema) => (
              <option key={cinema.id} value={cinema.id}>
                {cinema.name}
                {cinema.status === 'INACTIVE' ? ' (tạm dừng)' : ''}
              </option>
            ))}
          </select>
          {errors.cinemaId && <p className={errorClass}>{errors.cinemaId}</p>}
          {cinemasError ? (
            <AlertMessage variant="error" className="mt-2">
              Không tải được danh mục rạp.{' '}
              <button
                type="button"
                onClick={onRetryCinemas}
                className="underline font-bold cursor-pointer"
              >
                Thử lại
              </button>
            </AlertMessage>
          ) : (
            hasMoreCinemas && (
              <button
                type="button"
                onClick={onLoadMoreCinemas}
                disabled={cinemasLoading || disabled}
                className="mt-1.5 text-[11px] font-semibold text-[#e6e2c1] hover:underline cursor-pointer disabled:opacity-40"
              >
                {cinemasLoading ? 'Đang tải...' : 'Tải thêm rạp'}
              </button>
            )
          )}
        </div>

        <div>
          <label htmlFor="revenueMovie" className={labelClass}>
            Phim
          </label>
          <div className="flex gap-2 mb-1.5">
            <input
              type="search"
              value={movieKeyword}
              onChange={(event) => onMovieKeywordChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onMovieSearch();
                }
              }}
              placeholder="Tìm theo tên phim..."
              aria-label="Tìm phim cho bộ lọc"
              disabled={disabled}
              className={fieldClass}
            />
            <button
              type="button"
              onClick={onMovieSearch}
              disabled={disabled}
              aria-label="Tìm phim"
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#1a1c24] border border-[#2b2f3e] text-zinc-300 hover:text-white hover:bg-[#252836] transition-colors cursor-pointer disabled:opacity-40"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <select
            id="revenueMovie"
            value={draft.movieId}
            onChange={(event) => onDraftChange({ movieId: event.target.value })}
            aria-invalid={Boolean(errors.movieId)}
            disabled={disabled}
            className={fieldClass}
          >
            <option value="">Tất cả phim</option>
            {movies.map((movie) => (
              <option key={movie.id} value={movie.id}>
                {movie.title}
                {movie.status === 'HIDDEN' ? ' (đã ẩn)' : movie.status === 'ENDED' ? ' (đã kết thúc)' : ''}
              </option>
            ))}
          </select>
          {errors.movieId && <p className={errorClass}>{errors.movieId}</p>}
          {moviesError ? (
            <AlertMessage variant="error" className="mt-2">
              Không tải được danh mục phim.{' '}
              <button
                type="button"
                onClick={onRetryMovies}
                className="underline font-bold cursor-pointer"
              >
                Thử lại
              </button>
            </AlertMessage>
          ) : (
            hasMoreMovies && (
              <button
                type="button"
                onClick={onLoadMoreMovies}
                disabled={moviesLoading || disabled}
                className="mt-1.5 text-[11px] font-semibold text-[#e6e2c1] hover:underline cursor-pointer disabled:opacity-40"
              >
                {moviesLoading ? 'Đang tải...' : 'Tải thêm phim'}
              </button>
            )
          )}
        </div>
      </div>

      {errors.range && (
        <p className={errorClass} role="alert">
          {errors.range}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {quickRanges.map((range) => (
          <button
            key={range.kind}
            type="button"
            onClick={() => onQuickRange(range.kind)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full bg-[#181a24] border border-[#2b2f3e] text-[11px] font-semibold text-zinc-300 hover:text-white hover:bg-[#222532] transition-colors cursor-pointer disabled:opacity-40"
          >
            {range.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {isDirty && (
            <span className="text-[11px] font-semibold text-amber-300">
              Bộ lọc chưa được áp dụng
            </span>
          )}
          <Button type="button" size="sm" onClick={onApply} disabled={disabled}>
            Áp dụng
          </Button>
        </div>
      </div>
    </section>
  );
};
