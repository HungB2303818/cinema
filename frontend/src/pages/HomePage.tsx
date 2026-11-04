import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Film, Sparkles, Search, MapPin, Tv, ArrowRight } from 'lucide-react';
import { useMovies, MovieCard } from '@/features/movies';
import type { MovieStatus } from '@/features/movies';
import { LoadingSpinner, ErrorState, EmptyState } from '@/shared/components/ui';
import { useCinemas } from '@/features/cinemas';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const activeTab: MovieStatus = statusParam === 'UPCOMING' ? 'UPCOMING' : 'SHOWING';

  const handleTabChange = (newStatus: MovieStatus) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('status', newStatus);
      return next;
    });
  };

  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: movieData, isLoading: loadingMovies, error: movieError, refetch } = useMovies({
    status: activeTab,
    size: 50,
  });

  const { data: cinemas = [] } = useCinemas();

  const movies = movieData?.content || [];
  const filteredMovies = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (movie.genre && movie.genre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canThoCinemas = cinemas.filter((c) => c.address.includes('Cần Thơ'));

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
            Cập nhật liên tục lịch chiếu các bộ phim bom tấn mới nhất tại hệ thống rạp toàn quốc.
          </p>
        </div>
      </section>

      {/* Tabs & Search Filter */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20232e] pb-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-2">
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
              <span>Phim đang chiếu</span>
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
              <span>Phim sắp chiếu</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm kiếm phim, thể loại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#13151d] border border-[#242733] text-zinc-200 text-sm rounded-full pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#e6e2c1] focus:ring-1 focus:ring-[#e6e2c1] transition-colors"
            />
          </div>
        </div>

        {/* Content Section */}
        {loadingMovies ? (
          <LoadingSpinner message="Đang tải danh sách phim..." />
        ) : movieError ? (
          <ErrorState
            title="Không thể tải danh sách phim"
            message={movieError instanceof Error ? movieError.message : 'Vui lòng kiểm tra lại kết nối mạng và thử lại.'}
            onRetry={() => refetch()}
          />
        ) : filteredMovies.length === 0 ? (
          <EmptyState
            icon={Film}
            title="Không tìm thấy bộ phim nào phù hợp"
            description={searchTerm ? `Không có phim nào khớp với từ khóa "${searchTerm}".` : 'Hiện tại chưa có phim nào trong danh mục này.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Cinemas Section */}
      <section className="space-y-6 pt-6 border-t border-[#20232e]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#e6e2c1] uppercase tracking-wider">
              Hệ thống rạp chiếu
            </span>
            <h2 className="text-2xl font-bold text-white">Cụm rạp CGV tại Cần Thơ</h2>
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
          {canThoCinemas.map((cinema) => (
            <article
              key={cinema.id}
              className="group overflow-hidden rounded-2xl bg-[#13151d] border border-[#242733] hover:border-[#e6e2c1]/60 transition-all duration-300 flex flex-col justify-between shadow-xl shadow-black/40"
            >
              <div className="aspect-video overflow-hidden bg-[#090a0f]">
                <img
                  src={cinema.images?.[0]}
                  alt={cinema.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ aspectRatio: '16 / 9' }}
                />
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg group-hover:text-[#e6e2c1] transition-colors">
                    {cinema.name}
                  </h3>
                  <p className="text-xs text-zinc-400 flex items-start gap-1 mt-1 line-clamp-2">
                    <MapPin className="w-3.5 h-3.5 text-[#e6e2c1] shrink-0 mt-0.5" />
                    <span>{cinema.address}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-[#20232e] flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Tv className="w-3.5 h-3.5 text-zinc-400" />
                    {cinema.roomsCount || 4} phòng chiếu
                  </span>
                  <Link
                    to={`/cinemas`}
                    className="text-xs font-bold text-[#e6e2c1] hover:underline inline-flex items-center gap-1"
                  >
                    Chi tiết &rarr;
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
