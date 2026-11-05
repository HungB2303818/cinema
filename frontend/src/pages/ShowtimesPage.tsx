import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Calendar, Film, Building2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useMovies, useMovieDetail } from '@/features/movies';
import { useMovieShowtimes, useCurrentTime, ShowtimeCard } from '@/features/showtimes';
import { useCinemas } from '@/features/cinemas';
import {
  getVietnamDateString,
  formatDate,
} from '@/shared/utils/format';
import { LoadingSpinner, ErrorState, EmptyState, Pagination, Button } from '@/shared/components/ui';

export const ShowtimesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL search params
  const movieIdParam = searchParams.get('movieId');
  const cinemaIdParam = searchParams.get('cinemaId');
  const dateParam = searchParams.get('date');
  const pageParam = parseInt(searchParams.get('page') || '0', 10);

  // Validate parameters
  const parsedMovieId = movieIdParam ? Number(movieIdParam) : undefined;
  const movieId = parsedMovieId && !isNaN(parsedMovieId) && parsedMovieId > 0 ? parsedMovieId : undefined;

  const parsedCinemaId = cinemaIdParam ? Number(cinemaIdParam) : undefined;
  const cinemaId = parsedCinemaId && !isNaN(parsedCinemaId) && parsedCinemaId > 0 ? parsedCinemaId : undefined;

  // Selected date in Asia/Ho_Chi_Minh: default to today if not provided or format is invalid
  const todayVietnam = getVietnamDateString();
  const selectedDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayVietnam;

  const currentPage = isNaN(pageParam) || pageParam < 0 ? 0 : pageParam;

  // Live timer for cutoff evaluation
  const now = useCurrentTime(15_000);

  // Fetch list of public cinemas for the filter dropdown
  const { data: cinemas = [], isLoading: loadingCinemas } = useCinemas();

  // Fetch movie list for the movie selector (when no movie is selected)
  const {
    data: allMoviesData,
    isLoading: loadingMoviesList,
    error: moviesListError,
    refetch: refetchMoviesList,
  } = useMovies({
    status: 'SHOWING',
    size: 50,
  });
  const availableMovies = allMoviesData?.content || [];

  // Fetch selected movie detail if movieId is selected
  const { data: selectedMovie } = useMovieDetail(movieId ?? 0);

  // Query showtimes ONLY when movieId and date are valid
  const showtimesParams = useMemo(() => {
    if (!movieId) return null;
    return {
      movieId,
      date: selectedDate,
      cinemaId,
      page: currentPage,
      size: 20,
    };
  }, [movieId, selectedDate, cinemaId, currentPage]);

  const {
    data: showtimeData,
    isLoading: loadingShowtimes,
    error: showtimeError,
    refetch: refetchShowtimes,
  } = useMovieShowtimes(showtimesParams);

  const showtimes = showtimeData?.content || [];
  const totalPages = showtimeData?.totalPages || 0;
  const totalElements = showtimeData?.totalElements || 0;

  // Param update handlers
  const handleSelectMovie = (newMovieId: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('movieId', newMovieId.toString());
      if (!next.get('date')) {
        next.set('date', selectedDate);
      }
      next.delete('page');
      return next;
    });
  };

  const handleClearMovie = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('movieId');
      next.delete('page');
      return next;
    });
  };

  const handleDateChange = (newDate: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('date', newDate);
      next.delete('page');
      return next;
    });
  };

  const handleCinemaChange = (newCinemaId?: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newCinemaId) {
        next.set('cinemaId', newCinemaId.toString());
      } else {
        next.delete('cinemaId');
      }
      next.delete('page');
      return next;
    });
  };

  const handlePageChange = (newPageOneBased: number) => {
    const newPageZeroBased = newPageOneBased - 1;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPageZeroBased <= 0) {
        next.delete('page');
      } else {
        next.set('page', newPageZeroBased.toString());
      }
      return next;
    });
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  // Selected cinema object for display context
  const selectedCinema = cinemaId ? cinemas.find((c) => c.id === cinemaId) : undefined;

  return (
    <div className="space-y-8 pb-16">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20232e] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#e6e2c1] uppercase tracking-wider mb-1">
            <Film className="w-4 h-4" />
            <span>Lịch Chiếu Phim</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {selectedMovie ? selectedMovie.title : 'Tra cứu lịch chiếu'}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {selectedCinema
              ? `Lịch chiếu tại ${selectedCinema.name}`
              : 'Chọn phim, ngày và cụm rạp để hiển thị các suất chiếu'}
          </p>
        </div>

        {/* Action button if movie is currently selected */}
        {movieId && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearMovie}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#181a24] hover:bg-[#222530] text-zinc-300 hover:text-white transition-colors cursor-pointer border-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Chọn phim khác</span>
            </button>
            <Link
              to={`/movies/${movieId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#181a24] hover:bg-[#222530] text-[#e6e2c1] transition-colors"
            >
              <span>Chi tiết phim</span>
            </Link>
          </div>
        )}
      </div>

      {/* CASE 1: No Movie Selected -> Show Movie Picker (Do NOT call showtime endpoint) */}
      {!movieId ? (
        <section className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#13151d] border border-[#242733] space-y-3">
            <div className="flex items-center gap-2 text-[#e6e2c1] font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              <span>Vui lòng chọn bộ phim để xem lịch chiếu</span>
            </div>
            <p className="text-zinc-400 text-sm">
              Hệ thống cung cấp lịch chiếu theo từng bộ phim cụ thể. Vui lòng bấm vào một bộ phim dưới
              đây để xem các suất chiếu khả dụng tại các cụm rạp.
            </p>
            {selectedCinema && (
              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-300 bg-[#090a0f] px-3 py-1.5 rounded-full border border-[#242733]">
                <Building2 className="w-3.5 h-3.5 text-[#e6e2c1]" />
                <span>Đang lọc theo cụm rạp: <strong>{selectedCinema.name}</strong></span>
              </div>
            )}
          </div>

          {loadingMoviesList ? (
            <div className="py-16">
              <LoadingSpinner message="Đang tải danh sách phim đang chiếu..." />
            </div>
          ) : moviesListError ? (
            <ErrorState
              title="Không thể tải danh sách phim"
              message={
                moviesListError instanceof Error
                  ? moviesListError.message
                  : 'Vui lòng kiểm tra lại kết nối mạng và thử lại.'
              }
              onRetry={() => refetchMoviesList()}
            />
          ) : availableMovies.length === 0 ? (
            <EmptyState
              icon={Film}
              title="Hiện không có phim đang chiếu"
              description="Vui lòng quay lại sau khi có các bộ phim mới được phát hành."
            />
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Danh sách phim đang chiếu</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {availableMovies.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => handleSelectMovie(movie.id)}
                    className="group text-left p-3 rounded-2xl bg-[#13151d] border border-[#242733] hover:border-[#e6e2c1]/60 transition-all flex flex-col justify-between space-y-3 cursor-pointer shadow-lg shadow-black/30 hover:scale-[1.02]"
                  >
                    <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#090a0f]">
                      <img
                        src={
                          movie.posterUrl ||
                          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'
                        }
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-[#e6e2c1] transition-colors">
                        {movie.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                        {movie.durationMinutes} phút {movie.genre ? `• ${movie.genre}` : ''}
                      </p>
                    </div>
                    <span className="block w-full py-1.5 text-center text-xs font-bold rounded-full bg-[#181a24] group-hover:bg-[#e6e2c1] group-hover:text-black text-zinc-200 transition-colors">
                      Xem lịch chiếu
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        /* CASE 2: Movie Selected -> Show Filters & Showtimes */
        <section className="space-y-6">
          {/* Controls Bar: Date Picker & Cinema Selector */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#13151d] border border-[#242733] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Input in Vietnam Timezone */}
              <div className="flex items-center gap-2 bg-[#090a0f] border border-[#242733] rounded-full px-4 py-2">
                <Calendar className="w-4 h-4 text-[#e6e2c1]" />
                <label htmlFor="showtime-date" className="sr-only">
                  Chọn ngày chiếu
                </label>
                <input
                  id="showtime-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDateChange(e.target.value);
                    }
                  }}
                  className="bg-transparent text-zinc-200 text-xs sm:text-sm focus:outline-none cursor-pointer"
                />
              </div>

              {/* Cinema Selector */}
              <div className="flex items-center gap-2 bg-[#090a0f] border border-[#242733] rounded-full px-4 py-2">
                <Building2 className="w-4 h-4 text-[#e6e2c1]" />
                <label htmlFor="cinema-select" className="sr-only">
                  Chọn cụm rạp
                </label>
                <select
                  id="cinema-select"
                  value={cinemaId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleCinemaChange(val ? Number(val) : undefined);
                  }}
                  disabled={loadingCinemas}
                  className="bg-transparent text-zinc-200 text-xs sm:text-sm focus:outline-none cursor-pointer"
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
              </div>
            </div>

            {/* Quick date display */}
            <div className="text-xs text-zinc-400">
              Ngày xem: <strong className="text-zinc-200">{formatDate(selectedDate)}</strong>
            </div>
          </div>

          {/* Showtimes Result State */}
          {loadingShowtimes ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner message="Đang tìm kiếm các suất chiếu khả dụng..." />
            </div>
          ) : showtimeError ? (
            <ErrorState
              title="Không thể tải danh sách suất chiếu"
              message={
                showtimeError instanceof Error
                  ? showtimeError.message
                  : 'Đã có lỗi xảy ra khi truy vấn dữ liệu từ máy chủ.'
              }
              onRetry={() => refetchShowtimes()}
            />
          ) : showtimes.length === 0 ? (
            <EmptyState
              icon={Film}
              title={`Không có suất chiếu nào trong ngày ${formatDate(selectedDate)}`}
              description={
                cinemaId
                  ? 'Không tìm thấy suất chiếu nào tại cụm rạp đã chọn. Vui lòng chọn ngày khác hoặc xem tất cả rạp.'
                  : 'Không có suất chiếu nào cho bộ phim này trong ngày đã chọn. Vui lòng chọn ngày khác.'
              }
              action={
                cinemaId ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCinemaChange(undefined)}
                  >
                    Xem tất cả cụm rạp
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>
                  Tìm thấy <strong className="text-zinc-200">{totalElements}</strong> suất chiếu
                </span>
                {totalPages > 1 && (
                  <span>
                    Trang {currentPage + 1} / {totalPages}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {showtimes.map((st) => (
                  <ShowtimeCard key={st.id} showtime={st} now={now} />
                ))}
              </div>

              {/* Pagination if multiple pages */}
              {totalPages > 1 && (
                <div className="pt-6 border-t border-[#20232e] flex justify-center">
                  <Pagination
                    currentPage={currentPage + 1}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
