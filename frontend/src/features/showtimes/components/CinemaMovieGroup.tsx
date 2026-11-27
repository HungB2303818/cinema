import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Film } from 'lucide-react';
import type { CinemaMovieShowtimeGroup } from '../types/showtime.types';
import { formatTime, formatCurrency, isPastCutoff } from '@/shared/utils/format';

interface CinemaMovieGroupProps {
  group: CinemaMovieShowtimeGroup;
  now?: Date;
}

export const CinemaMovieGroup: React.FC<CinemaMovieGroupProps> = ({ group, now }) => {
  const { movie, showtimes } = group;
  const [posterError, setPosterError] = useState(false);
  const isMovieHidden = movie.status === 'HIDDEN';

  const fallbackPoster =
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';
  const posterUrl = !posterError && movie.posterUrl ? movie.posterUrl : fallbackPoster;

  return (
    <article className="p-5 sm:p-6 rounded-2xl bg-[#13151d] border border-[#242733] shadow-xl space-y-4">
      {/* Title & Age Rating header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#20232e] pb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/movies/${movie.id}`}
            className="text-base sm:text-lg font-black text-white hover:text-[#e6e2c1] transition-colors"
          >
            {movie.title}
          </Link>
          {isMovieHidden && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide bg-amber-500/15 text-amber-200 border border-amber-500/30">
              Ngừng nhận đặt vé mới
            </span>
          )}
          {movie.ageRating && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {movie.ageRating}
            </span>
          )}
          {movie.durationMinutes > 0 && (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              {movie.durationMinutes} phút
            </span>
          )}
        </div>

        <Link
          to={`/movies/${movie.id}`}
          className="text-xs text-zinc-400 hover:text-[#e6e2c1] transition-colors"
        >
          Chi tiết phim →
        </Link>
      </div>

      {/* Body: Poster on the left, Showtime buttons wrapped on the right */}
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        {/* Poster */}
        <div className="w-24 sm:w-28 md:w-32 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-[#090a0f] border border-[#242733] shadow-md">
          <img
            src={posterUrl}
            alt={movie.title}
            loading="lazy"
            onError={() => setPosterError(true)}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Showtimes List */}
        <div className="flex-1 w-full space-y-3">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#e6e2c1]" />
            <span>Suất chiếu khả dụng</span>
          </div>

          {showtimes.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-2">
              Không có suất chiếu phù hợp cho phim này trong ngày đã chọn.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {showtimes.map((showtime) => {
                const isCutoff = isPastCutoff(showtime.startsAt, null, 10, now);
                const isScheduled = showtime.status === 'SCHEDULED';
                const isShowtimeMovieHidden = isMovieHidden || showtime.movieStatus === 'HIDDEN';
                const canBook = isScheduled && !isCutoff && !isShowtimeMovieHidden;

                if (canBook) {
                  return (
                    <Link
                      key={showtime.id}
                      to={`/showtimes/${showtime.id}/seats`}
                      state={{
                        movieTitle: movie.title,
                        cinemaName: showtime.cinemaName,
                        roomName: showtime.roomName,
                        startsAt: showtime.startsAt,
                      }}
                      className="group/btn flex flex-col items-center justify-center min-w-[90px] px-3.5 py-2 rounded-xl bg-[#181a24] hover:bg-[#e6e2c1] border border-[#2e3242] hover:border-[#e6e2c1] transition-all cursor-pointer shadow-sm hover:scale-[1.03]"
                      title={`${formatTime(showtime.startsAt)} - ${showtime.roomName} - ${formatCurrency(showtime.basePrice)}`}
                      aria-label={`${movie.title}, ${formatTime(showtime.startsAt)}, ${showtime.roomName}`}
                    >
                      <span className="text-sm sm:text-base font-black text-white group-hover/btn:text-black">
                        {formatTime(showtime.startsAt)}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-400 group-hover/btn:text-zinc-800">
                        {showtime.roomName}
                      </span>
                    </Link>
                  );
                }

                if (isScheduled && isShowtimeMovieHidden) {
                  return (
                    <button
                      key={showtime.id}
                      type="button"
                      disabled
                      className="flex flex-col items-center justify-center min-w-[90px] px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-200 border border-amber-500/30 cursor-not-allowed"
                      title="Phim đã ngừng bán vé mới — suất vẫn diễn ra cho khách đã đặt"
                      aria-label={`${movie.title}, ${formatTime(showtime.startsAt)}, ${showtime.roomName} (Ngừng nhận đặt vé mới)`}
                    >
                      <span className="text-sm sm:text-base font-bold text-amber-100">
                        {formatTime(showtime.startsAt)}
                      </span>
                      <span className="text-[10px] text-amber-300/80">
                        {showtime.roomName} · Ngừng bán
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={showtime.id}
                    type="button"
                    disabled
                    className="flex flex-col items-center justify-center min-w-[90px] px-3.5 py-2 rounded-xl bg-[#101117] text-zinc-500 border border-[#1e202a] cursor-not-allowed opacity-60"
                    title={
                      !isScheduled
                        ? 'Suất chiếu đã hủy hoặc tạm dừng'
                        : 'Đã quá thời gian đặt vé (trước giờ chiếu 10 phút)'
                    }
                    aria-label={`${movie.title}, ${formatTime(showtime.startsAt)}, ${showtime.roomName} (Không khả dụng)`}
                  >
                    <span className="text-sm sm:text-base font-bold line-through text-zinc-500">
                      {formatTime(showtime.startsAt)}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {showtime.roomName} {!isScheduled ? 'Hủy' : 'Hết hạn'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
