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
    <article className="group flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-rose-950/20">
      {/* Poster with aspect ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
        <img
          src={movie.posterUrl || fallbackPoster}
          alt={`Poster phim ${movie.title}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackPoster;
          }}
          style={{ aspectRatio: '2 / 3' }}
        />

        {/* Age Rating Badge */}
        <span
          className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded shadow ${ageBadge.color}`}
        >
          {movie.ageRating || 'P'}
        </span>

        {/* Status Badge */}
        <span
          className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded shadow ${
            movie.status === 'SHOWING' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
          }`}
        >
          {movie.status === 'SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
        </span>
      </div>

      {/* Info Section */}
      <div className="flex flex-col flex-1 p-4">
        <h3
          className="font-bold text-base text-slate-100 line-clamp-1 group-hover:text-rose-400 transition-colors"
          title={movie.title}
        >
          {movie.title}
        </h3>

        {movie.genre && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{movie.genre}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{movie.durationMinutes} phút</span>
          </div>
          {movie.releaseDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatDate(movie.releaseDate)}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-2">
          <Link
            to={`/movies/${movie.id}`}
            className="block w-full text-center py-2 px-3 text-sm font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
          >
            {movie.status === 'SHOWING' ? 'Đặt vé ngay' : 'Xem thông tin'}
          </Link>
        </div>
      </div>
    </article>
  );
};
