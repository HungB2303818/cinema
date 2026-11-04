import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Tv, Film, Sparkles, Navigation } from 'lucide-react';
import type { Cinema } from '../types/cinema.types';
import { CINEMA_METADATA_MAP } from '../data/cinemasFallback';

interface CinemaCardProps {
  cinema: Cinema;
  onSelectCinema?: (cinema: Cinema) => void;
}

export const CinemaCard: React.FC<CinemaCardProps> = ({ cinema, onSelectCinema }) => {
  const meta = CINEMA_METADATA_MAP[cinema.name] || {
    city: cinema.address.includes('Cần Thơ') ? 'Cần Thơ' : 'Hà Nội',
    hotline: '1900 6017',
    mapEmbedUrl: '',
    bannerImage:
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
    images: [],
    roomTypes: ['2D', '3D'],
    features: ['Dolby Surround 7.1', 'Bắp nước CGV'],
  };

  const imageSrc = cinema.images?.[0] || meta.bannerImage;
  const roomTypes = cinema.roomTypes || meta.roomTypes;
  const roomsCount = cinema.roomsCount || 4;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-[#13151d] border border-[#242733] shadow-xl shadow-black/40 hover:border-[#e6e2c1]/60 hover:shadow-black/60 transition-all duration-300">
      {/* Media: Direct img with aspect-ratio and object-fit cover to prevent CLS */}
      <div className="relative overflow-hidden bg-[#090a0f] aspect-video">
        <img
          src={imageSrc}
          alt={`Cụm rạp ${cinema.name}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          style={{ aspectRatio: '16 / 9' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#13151d] via-transparent to-transparent opacity-80" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#e6e2c1] text-black shadow-md border-none">
            {meta.city}
          </span>
          {cinema.name.includes('Xuân Khánh') && (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-500 text-black shadow-md flex items-center gap-1 border-none">
              <Sparkles className="w-3 h-3" /> Gold Class
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#e6e2c1]/20 text-[#e6e2c1] backdrop-blur border-none">
            Đang hoạt động
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="p-5 pb-2">
        <h3 className="text-xl font-bold text-white group-hover:text-[#e6e2c1] transition-colors line-clamp-1">
          {cinema.name}
        </h3>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
          <MapPin className="w-4 h-4 text-[#e6e2c1] shrink-0 mt-0.5" />
          <span>{cinema.address}</span>
        </p>
      </header>

      {/* Content */}
      <div className="px-5 py-2 flex-1 flex flex-col justify-between gap-3">
        {/* Info pills */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#20232e]">
          <div className="flex items-center gap-2 text-zinc-300">
            <Tv className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>
              Quy mô: <strong className="text-white">{roomsCount} phòng</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <Phone className="w-4 h-4 text-[#e6e2c1] shrink-0" />
            <span>
              Hotline: <strong className="text-white">{meta.hotline}</strong>
            </span>
          </div>
        </div>

        {/* Format Tags */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-medium text-zinc-400 mr-1 flex items-center gap-1">
            <Film className="w-3 h-3 text-[#e6e2c1]" /> Định dạng:
          </span>
          {roomTypes.map((type) => (
            <span
              key={type}
              className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border-none ${
                type === 'Gold Class'
                  ? 'bg-amber-500/20 text-amber-300'
                  : type === 'Sweetbox'
                  ? 'bg-pink-500/20 text-pink-300'
                  : 'bg-[#181a24] text-zinc-300'
              }`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Native buttons/links kept as independent controls */}
      <footer className="p-5 pt-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onSelectCinema?.(cinema)}
          className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-full bg-[#181a24] hover:bg-[#222530] text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer border-none"
        >
          <Navigation className="w-3.5 h-3.5 text-[#e6e2c1]" />
          <span>Chi tiết & Phòng</span>
        </button>

        <Link
          to={`/showtimes?cinemaId=${cinema.id}`}
          className="flex-1 px-4 py-2.5 text-xs font-bold rounded-full bg-[#e6e2c1] hover:bg-[#dad6b2] text-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] border-none"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Lịch chiếu</span>
        </Link>
      </footer>
    </article>
  );
};
