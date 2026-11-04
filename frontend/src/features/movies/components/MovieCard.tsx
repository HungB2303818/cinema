import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar } from 'lucide-react';
import type { Movie } from '../types/movie.types';
import { formatDate, getAgeRatingBadge } from '@/shared/utils/format';

interface MovieCardProps {
  movie: Movie;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const ageBadge = getAgeRatingBadge(movie.ageRating);
  const fallbackPoster =
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80';

  return (
    <article className="group flex flex-col bg-[#13151d] border border-[#242733] rounded-2xl overflow-hidden hover:border-[#e6e2c1]/60 transition-all duration-300 hover:shadow-xl hover:shadow-black/40">
      {/* Compact Poster frame: ensures entire card fits on screen so "Đặt vé ngay" is visible with poster */}
      <div className="relative h-[240px] sm:h-[280px] md:h-[300px] w-full overflow-hidden bg-[#090a0f] flex items-center justify-center">
        {/* Ambient blurred backdrop so any slight aspect difference blends seamlessly */}
        <img
          src={movie.posterUrl || fallbackPoster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-110 pointer-events-none select-none"
        />

        {/* Main movie poster - 100% visible, never clipped or cut off */}
        <img
          src={movie.posterUrl || fallbackPoster}
          alt={`Poster phim ${movie.title}`}
          loading="lazy"
          className="relative z-10 w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackPoster;
          }}
        />

        {/* Age Rating Badge */}
        <span
          className={`absolute top-2.5 left-2.5 z-20 text-[11px] font-bold px-2 py-0.5 rounded-full border-none shadow-md ${ageBadge.color}`}
        >
          {movie.ageRating || 'P'}
        </span>

        {/* Status Badge */}
        <span
          className={`absolute top-2.5 right-2.5 z-20 text-[11px] font-bold px-2.5 py-0.5 rounded-full border-none shadow-md ${
            movie.status === 'SHOWING'
              ? 'bg-[#e6e2c1] text-black'
              : 'bg-zinc-800/90 text-zinc-200 backdrop-blur'
          }`}
        >
          {movie.status === 'SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
        </span>
      </div>

      {/* Info Section - compact & clean */}
      <div className="flex flex-col flex-1 p-4 justify-between">
        <div>
          <h3
            className="font-bold text-sm sm:text-base text-zinc-100 line-clamp-1 group-hover:text-[#e6e2c1] transition-colors"
            title={movie.title}
          >
            {movie.title}
          </h3>

          {movie.genre && (
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{movie.genre}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-2.5 pt-2.5 border-t border-[#20232e]">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>{movie.durationMinutes} phút</span>
            </div>
            {movie.releaseDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{formatDate(movie.releaseDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button: always visible together with the poster */}
        <div className="mt-3">
          <Link
            to={`/movies/${movie.id}`}
            className={`block w-full text-center py-2 sm:py-2.5 px-4 text-xs sm:text-sm font-bold rounded-full border-none transition-all duration-200 active:scale-[0.98] ${
              movie.status === 'SHOWING'
                ? 'bg-[#e6e2c1] hover:bg-[#dad6b2] text-black shadow-md'
                : 'bg-[#181a24] hover:bg-[#222530] text-zinc-200'
            }`}
          >
            {movie.status === 'SHOWING' ? 'Đặt vé ngay' : 'Xem thông tin'}
          </Link>
        </div>
      </div>
    </article>
  );
};
