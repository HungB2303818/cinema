import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Calendar, Film, ArrowLeft } from 'lucide-react';
import { useMovieDetail } from '@/features/movies';
import { useShowtimes } from '@/features/showtimes';
import { formatDate, formatDateTime, formatCurrency, getAgeRatingBadge } from '@/shared/utils/format';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

export const MovieDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);

  const { data: movie, isLoading: loadingMovie, error: movieError } = useMovieDetail(movieId);
  const { data: showtimes = [] } = useShowtimes({ movieId });

  if (loadingMovie) return <LoadingSpinner message="Đang tải thông tin phim..." />;

  if (movieError || !movie) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-rose-400">
          {movieError instanceof Error ? movieError.message : 'Không tìm thấy bộ phim này.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </Link>
      </div>
    );
  }

  const ageBadge = getAgeRatingBadge(movie.ageRating);
  const fallbackPoster =
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';

  return (
    <div className="space-y-12 pb-16">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại</span>
      </Link>

      {/* Movie Hero Info */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-950 shadow-lg">
          <img
            src={movie.posterUrl || fallbackPoster}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackPoster;
            }}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded shadow ${ageBadge.color}`}>
                {ageBadge.label}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded shadow ${
                  movie.status === 'SHOWING' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {movie.status === 'SHOWING' ? 'Đang chiếu tại các rạp' : 'Sắp khởi chiếu'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>{movie.durationMinutes} phút</span>
              </div>
              {movie.releaseDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-500" />
                  <span>Khởi chiếu: {formatDate(movie.releaseDate)}</span>
                </div>
              )}
              {movie.genre && (
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-rose-500" />
                  <span>{movie.genre}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Nội dung phim
              </h3>
              <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                {movie.description || 'Chưa có thông tin mô tả chi tiết cho bộ phim này.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Showtimes Section */}
      <section className="space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-white">Lịch chiếu tại các rạp</h2>
          <p className="text-sm text-slate-400 mt-1">Chọn suất chiếu phù hợp để tiếp tục chọn ghế</p>
        </div>

        {showtimes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            <Film className="w-10 h-10 mx-auto opacity-50 mb-3" />
            <p>Hiện tại chưa có suất chiếu mở bán cho bộ phim này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {showtimes.map((st) => (
              <div
                key={st.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-rose-500/50 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-rose-400">{st.cinemaName || 'CGV Cinema'}</span>
                    <span>{st.roomName || 'Phòng chiếu'}</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatDateTime(st.startsAt)}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    Giá từ: <span className="text-slate-200 font-semibold">{formatCurrency(st.basePrice)}</span>
                  </div>
                </div>

                <Link
                  to={`/showtimes?showtimeId=${st.id}`}
                  className="block text-center py-2 px-3 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                >
                  Chọn suất này
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
