import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Film, Sparkles, ArrowRight } from 'lucide-react';
import { useMovies, MovieCard } from '@/features/movies';
import type { MovieQueryParams } from '@/features/movies';
import { LoadingSpinner, ErrorState, EmptyState, Pagination } from '@/shared/components/ui';
import { useCinemas, CinemaCard } from '@/features/cinemas';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params
  const statusParam = searchParams.get('status');
  const pageParam = parseInt(searchParams.get('page') || '0', 10);
  const currentPage = isNaN(pageParam) || pageParam < 0 ? 0 : pageParam;

  // Status tab: SHOWING is default if not set
  const activeTab = statusParam === 'UPCOMING' ? 'UPCOMING' : 'SHOWING';

  const handleTabChange = (newStatus: 'SHOWING' | 'UPCOMING') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('status', newStatus);
      next.delete('keyword');
      next.delete('genre');
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
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  // Fetch movies via real API with pagination and filters
  const queryParams = useMemo<MovieQueryParams>(() => {
    return {
      status: activeTab,
      page: currentPage,
      size: 12,
    };
  }, [activeTab, currentPage]);

  const {
    data: movieData,
    isLoading: loadingMovies,
    error: movieError,
    refetch,
  } = useMovies(queryParams);

  const { data: cinemas = [] } = useCinemas();
  const movies = movieData?.content || [];
  const totalPages = movieData?.totalPages || 0;
  const totalElements = movieData?.totalElements || 0;

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#10121a] via-[#151724] to-[#0d0e14] border border-[#242733] p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#e6e2c1]/15 text-[#e6e2c1]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trải nghiệm điện ảnh đỉnh cao</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Đặt vé xem phim trực tuyến nhanh chóng & dễ dàng
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base">
            Cập nhật liên tục lịch chiếu các bộ phim bom tấn mới nhất tại hệ thống rạp trên toàn quốc.
          </p>
        </div>
      </section>

      {/* Public movie categories */}
      <section className="space-y-6">
        <div className="space-y-4 border-b border-[#20232e] pb-6">
          {/* Tab Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleTabChange('SHOWING')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer border-none ${
                  activeTab === 'SHOWING'
                    ? 'bg-[#e6e2c1] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-[#161822]'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Đang chiếu</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('UPCOMING')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer border-none ${
                  activeTab === 'UPCOMING'
                    ? 'bg-[#e6e2c1] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-[#161822]'
                }`}
              >
                <span>Sắp chiếu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loadingMovies ? (
          <div className="py-20">
            <LoadingSpinner message="Đang tải danh sách phim..." />
          </div>
        ) : movieError ? (
          <ErrorState
            title="Không thể tải danh sách phim"
            message={
              movieError instanceof Error
                ? movieError.message
                : 'Vui lòng kiểm tra lại kết nối mạng và thử lại.'
            }
            onRetry={() => refetch()}
          />
        ) : movies.length === 0 ? (
          <EmptyState
            icon={Film}
            title="Không tìm thấy bộ phim nào phù hợp"
            description={activeTab === 'UPCOMING' ? 'Hiện chưa có phim sắp chiếu.' : 'Hiện chưa có phim đang chiếu.'}
          />
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>
                Tìm thấy <strong className="text-zinc-200">{totalElements}</strong> bộ phim
              </span>
              <span>
                Trang {currentPage + 1} / {totalPages || 1}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            {/* Pagination Controls */}
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

      {/* Featured Cinemas Section */}
      {cinemas.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-[#20232e]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#e6e2c1] uppercase tracking-wider">
                Hệ thống rạp chiếu
              </span>
              <h2 className="text-2xl font-bold text-white">Cụm rạp đối tác</h2>
            </div>
            <Link
              to="/cinemas"
              className="text-sm font-semibold text-[#e6e2c1] hover:underline flex items-center gap-1 group"
            >
              <span>Xem tất cả rạp</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cinemas.slice(0, 3).map((cinema) => (
              <CinemaCard key={cinema.id} cinema={cinema} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
