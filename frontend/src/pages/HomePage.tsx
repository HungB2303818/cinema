import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Film, Sparkles, Search, ArrowRight } from 'lucide-react';
import { useMovies, MovieCard } from '@/features/movies';
import type { MovieStatus } from '@/features/movies';
import { LoadingSpinner, ErrorState, EmptyState, Pagination } from '@/shared/components/ui';
import { useCinemas, CinemaCard } from '@/features/cinemas';

const POPULAR_GENRES = [
  'Tất cả thể loại',
  'Hành động',
  'Kinh dị',
  'Hài hước',
  'Hoạt hình',
  'Tình cảm',
  'Khoa học viễn tưởng',
  'Phiêu lưu',
];

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params
  const statusParam = searchParams.get('status');
  const keywordParam = searchParams.get('keyword') || '';
  const genreParam = searchParams.get('genre') || '';
  const pageParam = parseInt(searchParams.get('page') || '0', 10);
  const currentPage = isNaN(pageParam) || pageParam < 0 ? 0 : pageParam;

  // Status tab: SHOWING is default if not set
  const activeTab: MovieStatus | 'ALL' =
    statusParam === 'UPCOMING'
      ? 'UPCOMING'
      : statusParam === 'ENDED'
      ? 'ENDED'
      : statusParam === 'ALL'
      ? 'ALL'
      : 'SHOWING';

  // Search input state with debounce
  const [searchTerm, setSearchTerm] = useState(keywordParam);
  const [prevKeywordParam, setPrevKeywordParam] = useState(keywordParam);
  const isFirstMount = useRef(true);

  // Sync input during render when URL param changes (e.g., Back/Forward navigation)
  if (keywordParam !== prevKeywordParam) {
    setPrevKeywordParam(keywordParam);
    setSearchTerm(keywordParam);
  }

  // Debounced search sync to URL without polluting history stack or creating update loop
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const currentKeyword = searchParams.get('keyword') || '';
      const trimmed = searchTerm.trim();

      if (trimmed !== currentKeyword) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (trimmed) {
              next.set('keyword', trimmed);
            } else {
              next.delete('keyword');
            }
            // Reset page when keyword changes
            next.delete('page');
            return next;
          },
          { replace: true }
        );
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, setSearchParams]);

  const handleTabChange = (newStatus: MovieStatus | 'ALL') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newStatus === 'ALL') {
        next.set('status', 'ALL');
      } else {
        next.set('status', newStatus);
      }
      next.delete('page');
      return next;
    });
  };

  const handleGenreChange = (genre: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!genre || genre === 'Tất cả thể loại') {
        next.delete('genre');
      } else {
        next.set('genre', genre);
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
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  // Fetch movies via real API with pagination and filters
  const queryParams = useMemo(() => {
    return {
      status: activeTab === 'ALL' ? undefined : (activeTab as MovieStatus),
      keyword: keywordParam.trim() || undefined,
      genre: genreParam.trim() || undefined,
      page: currentPage,
      size: 12,
    };
  }, [activeTab, keywordParam, genreParam, currentPage]);

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

      {/* Tabs, Search & Genre Filter */}
      <section className="space-y-6">
        <div className="space-y-4 border-b border-[#20232e] pb-6">
          {/* Top row: Tab Switcher & Search Box */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tab Switcher */}
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

              <button
                type="button"
                onClick={() => handleTabChange('ENDED')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer border-none ${
                  activeTab === 'ENDED'
                    ? 'bg-[#e6e2c1] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-[#161822]'
                }`}
              >
                <span>Đã kết thúc</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('ALL')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer border-none ${
                  activeTab === 'ALL'
                    ? 'bg-[#e6e2c1] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-[#161822]'
                }`}
              >
                <span>Tất cả phim</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Tìm tên phim..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#13151d] border border-[#242733] text-zinc-200 text-sm rounded-full pl-9 pr-10 py-2.5 focus:outline-none focus:border-[#e6e2c1] focus:ring-1 focus:ring-[#e6e2c1] transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer border-none"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Genre chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-zinc-500 font-medium whitespace-nowrap">Thể loại:</span>
            {POPULAR_GENRES.map((g) => {
              const isSelected =
                (g === 'Tất cả thể loại' && !genreParam) || genreParam.toLowerCase() === g.toLowerCase();
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGenreChange(g)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer border-none ${
                    isSelected
                      ? 'bg-[#e6e2c1] text-black font-bold'
                      : 'bg-[#13151d] text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1f2b]'
                  }`}
                >
                  {g}
                </button>
              );
            })}
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
            description={
              keywordParam
                ? `Không có kết quả nào cho từ khóa "${keywordParam}".`
                : 'Hiện tại chưa có bộ phim nào trong danh mục hoặc thể loại này.'
            }
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
