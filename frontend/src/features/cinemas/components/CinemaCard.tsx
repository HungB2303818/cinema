import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Film, Info, Building2, ImageOff } from 'lucide-react';
import type { Cinema } from '../types/cinema.types';
import { getCinemaImage } from '../utils/cinema-image';
import { getVietnamDateString } from '@/shared/utils/format';

interface CinemaCardProps {
  cinema: Cinema;
  onSelectCinema?: (cinema: Cinema) => void;
}

export const CinemaCard: React.FC<CinemaCardProps> = ({ cinema, onSelectCinema }) => {
  const imageInfo = getCinemaImage(cinema);
  const [imageError, setImageError] = useState(false);

  const showImage = imageInfo.imageUrl && !imageError;
  const showtimesUrl = `/showtimes?cinemaId=${cinema.id}&date=${getVietnamDateString()}`;

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-[#13151d] border border-[#242733] shadow-xl shadow-black/40 hover:border-[#e6e2c1]/60 hover:shadow-black/60 transition-all duration-300">
      {/* Cinema Image Frame: 16:9 aspect ratio - Clickable */}
      <Link
        to={showtimesUrl}
        className="relative aspect-video w-full overflow-hidden bg-[#090a0f] border-b border-[#20232e] flex items-center justify-center cursor-pointer"
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
      </Link>

      {/* Cinema Information */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[#e6e2c1] text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>Cụm rạp</span>
          </div>

          <Link to={showtimesUrl} className="block group/title">
            <h3
              className="text-lg font-bold text-white group-hover/title:text-[#e6e2c1] transition-colors line-clamp-1"
              title={cinema.name}
            >
              {cinema.name}
            </h3>
          </Link>

          <p className="flex items-start gap-1.5 text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
            <MapPin className="w-3.5 h-3.5 text-[#e6e2c1] shrink-0 mt-0.5" />
            <span className="leading-relaxed">{cinema.address}</span>
          </p>
        </div>

        {/* Action Controls */}
        <footer className="pt-3 border-t border-[#20232e] flex items-center gap-2.5">
          {onSelectCinema && (
            <button
              type="button"
              onClick={() => onSelectCinema(cinema)}
              className="flex-1 px-3.5 py-2 text-xs font-semibold rounded-full bg-[#181a24] hover:bg-[#222530] text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer border-none"
            >
              <Info className="w-3.5 h-3.5 text-[#e6e2c1]" />
              <span>Phòng chiếu</span>
            </button>
          )}

          <Link
            to={showtimesUrl}
            className="flex-1 px-3.5 py-2 text-xs font-bold rounded-full bg-[#e6e2c1] hover:bg-[#dad6b2] text-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] border-none text-center"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Lịch chiếu</span>
          </Link>
        </footer>
      </div>
    </article>
  );
};
