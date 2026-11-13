import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Calendar, Film, ArrowLeft, Building2, ChevronDown } from 'lucide-react';
import { useMovieDetail } from '@/features/movies';
import {
  useMovieShowtimes,
  useCurrentTime,
  CinemaShowtimeList,
  ShowtimeDateStrip,
} from '@/features/showtimes';
import { useCinemas } from '@/features/cinemas';
import {
  formatDate,
  getAgeRatingBadge,
  getMovieStatusBadge,
  getVietnamDateString,
} from '@/shared/utils/format';
import { LoadingSpinner, ErrorState, EmptyState, Button } from '@/shared/components/ui';
import type { ApiErrorResponse } from '@/shared/api/http-client';

export const MovieDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);

  const {
    data: movie,
    isLoading: loadingMovie,
    error: movieError,
    refetch: refetchMovie,
  } = useMovieDetail(movieId);

  // Date selection in Asia/Ho_Chi_Minh
  const [selectedDate, setSelectedDate] = useState<string>(() => getVietnamDateString());
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | undefined>(undefined);

  // Query showtimes for this movie
  const {
    data: showtimeData,
    isLoading: loadingShowtimes,
    error: showtimeError,
    refetch: refetchShowtimes,
  } = useMovieShowtimes(
    !isNaN(movieId) && movieId > 0 && selectedDate
      ? {
          movieId,
          date: selectedDate,
          cinemaId: selectedCinemaId,
          page: 0,
          size: 50,
        }
      : null
  );

  const { data: cinemas = [] } = useCinemas();
  const showtimes = showtimeData?.content || [];
  const now = useCurrentTime(15_000); // live updates every 15s

  const fallbackPoster =
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';
  const [posterSrc, setPosterSrc] = useState<string | null>(null);

  // Loading state
  if (loadingMovie) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner message="Đang tải thông tin phim..." />
      </div>
    );
  }

  // Error handling: Distinguish 404 from network / 500 error
  if (movieError || !movie) {
    const apiErr = movieError as ApiErrorResponse | undefined;
    const is404 =
      apiErr?.status === 404 ||
      apiErr?.code === 'RESOURCE_NOT_FOUND' ||
      isNaN(movieId) ||
      movieId <= 0;

    return (
      <div className="py-16">
        <ErrorState
          title={is404 ? 'Không tìm thấy bộ phim này' : 'Lỗi kết nối máy chủ'}
          message={
            is404
              ? 'Bộ phim bạn tìm kiếm không tồn tại hoặc đã bị ẩn khỏi hệ thống.'
              : apiErr?.message || 'Không thể tải thông tin phim. Vui lòng kiểm tra lại kết nối mạng và thử lại.'
          }
          onRetry={!is404 ? () => refetchMovie() : undefined}
          action={
            <Link
              to="/movies"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#181a24] hover:bg-[#222530] text-zinc-200 text-xs font-semibold rounded-full border-none transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại danh sách phim</span>
            </Link>
          }
        />
      </div>
    );
  }

  const ageBadge = getAgeRatingBadge(movie.ageRating);
  const statusBadge = getMovieStatusBadge(movie.status);
  const currentPoster = posterSrc || movie.posterUrl || fallbackPoster;

  return (
    <div className="space-y-12 pb-16">
      {/* Back button */}
      <Link
        to="/movies"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-[#e6e2c1] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại danh sách phim</span>
      </Link>

      {/* Movie Hero Info */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 bg-[#13151d] border border-[#242733] rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative aspect-[7/10] w-full rounded-2xl overflow-hidden bg-[#090a0f] shadow-xl flex items-center justify-center">
          <img
            src={currentPoster}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110 pointer-events-none select-none"
          />

          <img
            src={currentPoster}
            alt={movie.title}
            className="relative z-10 w-full h-full object-contain"
            onError={() => {
              if (currentPoster !== fallbackPoster) {
                setPosterSrc(fallbackPoster);
              }
            }}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border-none shadow ${ageBadge.color}`}>
                {ageBadge.label}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border-none shadow ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#e6e2c1]" />
                <span>{movie.durationMinutes} phút</span>
              </div>
              {movie.releaseDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#e6e2c1]" />
                  <span>Khởi chiếu: {formatDate(movie.releaseDate)}</span>
                </div>
              )}
              {movie.genre && (
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#e6e2c1]" />
                  <span>{movie.genre}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-[#20232e]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Nội dung phim
              </h3>
              <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
                {movie.description || 'Chưa có thông tin mô tả chi tiết cho bộ phim này.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Showtimes Section */}
      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-white">Lịch chiếu</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Chọn cụm rạp và ngày để xem các suất chiếu khả dụng
          </p>
        </div>

        {/* Filters: Cinema Select & Date Strip */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {cinemas.length > 0 && (
            <div className="shrink-0 lg:w-72">
              <label
                htmlFor="cinema-filter"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-400"
              >
                Cụm rạp
              </label>
              <div className="relative">
                <Building2
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#e6e2c1]"
                  aria-hidden="true"
                />
                <select
                  id="cinema-filter"
                  value={selectedCinemaId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCinemaId(val ? Number(val) : undefined);
                  }}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-[#242733] bg-[#13151d] py-3 pl-10 pr-10 text-sm text-zinc-100 transition-colors focus:border-[#e6e2c1] focus:outline-none"
                >
                  <option value="" className="bg-[#13151d] text-zinc-200">
                    Tất cả cụm rạp
                  </option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#13151d] text-zinc-200">
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <ShowtimeDateStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>
        </div>

        {/* Showtime Statuses: Loading / Error / Empty / List */}
        {loadingShowtimes ? (
          <div className="py-12">
            <LoadingSpinner message="Đang tải lịch chiếu phim..." />
          </div>
        ) : showtimeError ? (
          <ErrorState
            title="Không thể tải lịch chiếu"
            message={
              showtimeError instanceof Error
                ? showtimeError.message
                : 'Đã có lỗi xảy ra khi truy vấn lịch chiếu từ máy chủ.'
            }
            onRetry={() => refetchShowtimes()}
          />
        ) : showtimes.length === 0 ? (
          <EmptyState
            icon={Film}
            title={`Chưa có suất chiếu trong ngày ${formatDate(selectedDate)}`}
            description="Hiện tại chưa có suất chiếu nào phù hợp với bộ lọc bạn chọn. Vui lòng chọn ngày chiếu khác hoặc chuyển đổi cụm rạp."
            action={
              selectedCinemaId ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCinemaId(undefined)}
                >
                  Xem tất cả rạp
                </Button>
              ) : undefined
            }
          />
        ) : (
          <CinemaShowtimeList
            showtimes={showtimes}
            cinemas={cinemas}
            movieTitle={movie.title}
            now={now}
          />
        )}
      </section>
    </div>
  );
};
