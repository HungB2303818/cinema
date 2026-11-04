import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Sparkles, Search, MapPin, Tv, ArrowRight } from 'lucide-react';
import { useMovies, MovieCard } from '@/features/movies';
import type { MovieStatus } from '@/features/movies';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { useCinemas } from '@/features/cinemas';

export const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MovieStatus>('SHOWING');
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/40 border border-slate-800 p-8 sm:p-12">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trải nghiệm điện ảnh đỉnh cao</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Đặt vé xem phim trực tuyến nhanh chóng & dễ dàng
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Cập nhật liên tục lịch chiếu các bộ phim bom tấn mới nhất tại hệ thống rạp toàn quốc.
          </p>
        </div>
      </section>

      {/* Tabs & Search Filter */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('SHOWING')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'SHOWING'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Phim đang chiếu</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UPCOMING')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'UPCOMING'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>Phim sắp chiếu</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm phim, thể loại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
          </div>
        </div>

        {/* Content Section */}
        {loadingMovies ? (
          <LoadingSpinner message="Đang tải danh sách phim..." />
        ) : movieError ? (
          <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-6 text-center text-rose-300">
            <p>{movieError instanceof Error ? movieError.message : 'Không thể tải danh sách phim.'}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Film className="w-12 h-12 mx-auto stroke-1 opacity-50 mb-3" />
            <p className="text-sm">Không tìm thấy bộ phim nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Cinemas Section */}
      <section className="space-y-6 pt-6 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
              Hệ thống rạp chiếu
            </span>
            <h2 className="text-2xl font-bold text-white">Cụm rạp CGV tại Cần Thơ</h2>
          </div>
          <Link
            to="/cinemas"
            className="text-sm font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 group"
          >
            <span>Xem tất cả rạp</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {canThoCinemas.map((cinema) => (
            <article
              key={cinema.id}
              className="group overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all flex flex-col justify-between"
            >
              <div className="aspect-video overflow-hidden bg-slate-950">
                <img
                  src={cinema.images?.[0]}
                  alt={cinema.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ aspectRatio: '16 / 9' }}
                />
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg group-hover:text-rose-400 transition-colors">
                    {cinema.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-start gap-1 mt-1 line-clamp-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{cinema.address}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Tv className="w-3.5 h-3.5 text-indigo-400" />
                    {cinema.roomsCount || 4} phòng chiếu
                  </span>
                  <Link
                    to={`/cinemas`}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
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
