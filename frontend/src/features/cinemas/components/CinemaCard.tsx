import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Info, Building2, ImageOff } from 'lucide-react';
import type { Cinema } from '../types/cinema.types';
import { getCinemaImage } from '../utils/cinema-image';

interface CinemaCardProps {
  cinema: Cinema;
  onSelectCinema?: (cinema: Cinema) => void;
}

export const CinemaCard: React.FC<CinemaCardProps> = ({ cinema, onSelectCinema }) => {
  const imageInfo = getCinemaImage(cinema);
  const [imageError, setImageError] = useState(false);

  const showImage = imageInfo.imageUrl && !imageError;

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#13151d] border border-[#242733] shadow-xl shadow-black/40 hover:border-[#e6e2c1]/60 hover:shadow-black/60 transition-all duration-300">
      <Link
        to={`/showtimes?cinemaId=${cinema.id}`}
        aria-label={`Xem lịch chiếu rạp ${cinema.name}`}
        className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-[#e6e2c1]"
      />
      {/* Cinema Image Frame: 16:9 aspect ratio */}
      <div
        className="relative aspect-video w-full overflow-hidden bg-[#090a0f] border-b border-[#20232e] flex items-center justify-center"
        aria-label={`Hình ảnh rạp ${cinema.name}`}
      >
        {showImage ? (
          <>
            <img
              src={imageInfo.imageUrl!}
              alt={imageInfo.alt}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#13151d]/90 via-transparent to-transparent pointer-events-none" />

            {/* Illustrative image badge if applicable */}
            {imageInfo.isIllustrative && (
              <span className="absolute bottom-2.5 left-2.5 z-10 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/75 text-zinc-300 backdrop-blur border border-zinc-700/60 shadow-sm pointer-events-none">
                Ảnh minh họa
              </span>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-zinc-500 select-none">
            <div className="p-3 rounded-full bg-[#181a24] text-zinc-400">
              {imageError ? <ImageOff className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
            </div>
            <span className="text-xs font-medium text-zinc-400">
              {imageError ? 'Không tải được ảnh' : 'Chưa có hình ảnh rạp'}
            </span>
          </div>
        )}

        {/* Operating status badge */}
        <span
          className={`absolute top-2.5 right-2.5 z-10 px-2.5 py-0.5 text-[11px] font-bold rounded-full shadow-md border-none pointer-events-none ${
            cinema.status === 'ACTIVE'
              ? 'bg-emerald-500/90 text-white backdrop-blur'
              : 'bg-zinc-800/90 text-zinc-300 backdrop-blur'
          }`}
        >
          {cinema.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
        </span>
      </div>

      {/* Cinema Information */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="block">
            <h3
              className="text-lg font-bold text-white group-hover/title:text-[#e6e2c1] transition-colors line-clamp-1"
              title={cinema.name}
            >
              {cinema.name}
            </h3>
          </div>

          <p className="flex items-start gap-1.5 text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
            <MapPin className="w-3.5 h-3.5 text-[#e6e2c1] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{cinema.address}</span>
          </p>
        </div>
      </div>
    </article>
  );
};
