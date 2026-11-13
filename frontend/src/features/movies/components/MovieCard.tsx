import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Calendar } from "lucide-react";
import type { Movie } from "../types/movie.types";
import {
  formatDate,
  getAgeRatingBadge,
  getMovieStatusBadge,
} from "@/shared/utils/format";

interface MovieCardProps {
  movie: Movie;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const ageBadge = getAgeRatingBadge(movie.ageRating);
  const fallbackPoster =
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80";

  const [imageSrc, setImageSrc] = useState<string>(
    movie.posterUrl || fallbackPoster,
  );

  return (
    <article className="group flex flex-col bg-[#13151d] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-black/40">
      {/* Compact Poster frame */}
      <div className="relative h-[240px] sm:h-[280px] md:h-[300px] w-full overflow-hidden bg-[#090a0f] flex items-center justify-center">
        {/* Ambient blurred backdrop */}
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-110 pointer-events-none select-none"
        />

        {/* Main movie poster */}
        <img
          src={imageSrc}
          alt={`Poster phim ${movie.title}`}
          loading="lazy"
          className="relative z-10 w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          onError={() => {
            if (imageSrc !== fallbackPoster) {
              setImageSrc(fallbackPoster);
            }
          }}
        />

        {/* Age Rating Badge */}
        <span
          className={`absolute top-2.5 left-2.5 z-20 text-[20px] font-bold px-2 py-0.5 border-none shadow-md ${ageBadge.color}`}
        >
          {movie.ageRating || "P"}
        </span>
      </div>

      {/* Info Section */}
      <div className="flex flex-col flex-1 p-4 justify-between">
        <div>
          <h3
            className="font-bold text-sm sm:text-base text-zinc-100 line-clamp-1 group-hover:text-[#e6e2c1] transition-colors"
            title={movie.title}
          >
            {movie.title}
          </h3>

          {movie.genre && (
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
              {movie.genre}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-zinc-400 pt-2.5">
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

        {/* Action Button */}
        <div className="mt-3">
          <Link
            to={`/movies/${movie.id}`}
            className={`block w-full text-center py-2 sm:py-2.5 px-4 text-xs sm:text-sm font-bold rounded-full border-none transition-all duration-200 active:scale-[0.98] ${
              movie.status === "SHOWING"
                ? "bg-[#e6e2c1] hover:bg-[#dad6b2] text-black shadow-md"
                : "bg-[#181a24] hover:bg-[#222530] text-zinc-200"
            }`}
          >
            {movie.status === "SHOWING"
              ? "Đặt vé ngay"
              : movie.status === "UPCOMING"
                ? "Xem thông tin"
                : "Chi tiết phim"}
          </Link>
        </div>
      </div>
    </article>
  );
};
