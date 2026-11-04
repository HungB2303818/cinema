import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Calendar, Film, ArrowLeft } from 'lucide-react';
import { useMovieDetail } from '@/features/movies';
import { useShowtimes } from '@/features/showtimes';
import { formatDate, formatDateTime, formatCurrency, getAgeRatingBadge } from '@/shared/utils/format';
import { LoadingSpinner, ErrorState, EmptyState, StatusBadge } from '@/shared/components/ui';

export const MovieDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);

  const { data: movie, isLoading: loadingMovie, error: movieError, refetch } = useMovieDetail(movieId);
  const { data: showtimes = [] } = useShowtimes({ movieId });

  if (loadingMovie) return <LoadingSpinner message="Đang tải thông tin phim..." />;

  if (movieError || !movie) {
    return (
      <div className="py-16">
        <ErrorState
          title="Không tìm thấy bộ phim này"
          message={movieError instanceof Error ? movieError.message : 'Bộ phim bạn tìm kiếm không tồn tại hoặc đã bị ẩn khỏi hệ thống.'}
          onRetry={() => refetch()}
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#181a24] hover:bg-[#222530] text-zinc-200 text-xs font-semibold rounded-full border-none transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại trang chủ</span>
            </Link>
          }
        />
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
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-[#e6e2c1] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại</span>
      </Link>

      {/* Movie Hero Info */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 bg-[#13151d] border border-[#242733] rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#090a0f] shadow-xl">
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
              <span className={`text-xs font-bold px-3 py-1 rounded-full border-none shadow ${ageBadge.color}`}>
                {ageBadge.label}
              </span>
              <StatusBadge status={movie.status} size="sm" />
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
      <section className="space-y-6">
        <div className="border-b border-[#20232e] pb-4">
          <h2 className="text-2xl font-bold text-white">Lịch chiếu tại các rạp</h2>
          <p className="text-sm text-zinc-400 mt-1">Chọn suất chiếu phù hợp để tiếp tục chọn ghế</p>
        </div>

        {showtimes.length === 0 ? (
          <EmptyState
            icon={Film}
            title="Chưa có suất chiếu mở bán"
            description="Hiện tại chưa có suất chiếu nào cho bộ phim này. Vui lòng quay lại sau hoặc tham khảo phim khác."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {showtimes.map((st) => (
              <div
                key={st.id}
                className="bg-[#13151d] border border-[#242733] rounded-2xl p-5 hover:border-[#e6e2c1]/60 transition-all flex flex-col justify-between space-y-4 shadow-lg shadow-black/30"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span className="font-bold text-[#e6e2c1]">{st.cinemaName || 'CGV Cinema'}</span>
                    <span>{st.roomName || 'Phòng chiếu'}</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatDateTime(st.startsAt)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-2">
                    Giá từ: <span className="text-zinc-200 font-bold">{formatCurrency(st.basePrice)}</span>
                  </div>
                </div>

                <Link
                  to={`/showtimes?showtimeId=${st.id}`}
                  className="block text-center py-2.5 px-4 text-xs font-bold rounded-full bg-[#e6e2c1] hover:bg-[#dad6b2] text-black shadow-md transition-all duration-200 active:scale-[0.98] border-none"
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
