import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, MapPin, Tv, Film, Sparkles, Navigation, CheckCircle2 } from 'lucide-react';
import type { Cinema, CinemaRoom } from '../types/cinema.types';
import { CINEMA_METADATA_MAP, FALLBACK_CINEMAS } from '../data/cinemasFallback';
import { cinemasApi } from '../api/cinemas.api';

interface CinemaDetailModalProps {
  cinema: Cinema | null;
  onClose: () => void;
}

function getFallbackRooms(c: Cinema): CinemaRoom[] {
  const found = FALLBACK_CINEMAS.find((item) => item.name === c.name || item.id === c.id);
  if (found && found.rooms) {
    return found.rooms;
  }
  return [
    { id: 1, cinemaId: c.id, name: 'Phòng 01 (2D)', status: 'ACTIVE' },
    { id: 2, cinemaId: c.id, name: 'Phòng 02 (2D)', status: 'ACTIVE' },
    { id: 3, cinemaId: c.id, name: 'Phòng 03 (3D)', status: 'ACTIVE' },
    { id: 4, cinemaId: c.id, name: 'Phòng 04 (2D)', status: 'ACTIVE' },
  ];
}

export const CinemaDetailModal: React.FC<CinemaDetailModalProps> = ({ cinema, onClose }) => {
  const [rooms, setRooms] = useState<CinemaRoom[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    if (!cinema) return;

    setActiveImage(null);
    setLoadingRooms(true);

    cinemasApi
      .getById(cinema.id)
      .then((detail) => {
        if (detail.rooms && detail.rooms.length > 0) {
          setRooms(detail.rooms);
        } else {
          setRooms(getFallbackRooms(cinema));
        }
      })
      .catch(() => {
        setRooms(getFallbackRooms(cinema));
      })
      .finally(() => {
        setLoadingRooms(false);
      });
  }, [cinema]);

  if (!cinema) return null;

  const meta = CINEMA_METADATA_MAP[cinema.name] || {
    city: cinema.address.includes('Cần Thơ') ? 'Cần Thơ' : 'Hà Nội',
    hotline: '1900 6017',
    fax: '+84 4 6 275 5240',
    mapEmbedUrl: '',
    images: cinema.images || [],
    features: ['Dolby 7.1', 'Bắp nước CGV'],
  };

  const imagesList = (cinema.images && cinema.images.length > 0) ? cinema.images : meta.images;
  const currentBanner = activeImage || imagesList[0] || meta.bannerImage;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cinema-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col">
        {/* Header with Close */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">
              Chi tiết cụm rạp
            </span>
            <h2 id="cinema-modal-title" className="text-xl sm:text-2xl font-bold text-white">
              {cinema.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Main Gallery */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl bg-slate-950 aspect-[21/9] border border-slate-800/80">
              <img
                src={currentBanner}
                alt={cinema.name}
                className="w-full h-full object-cover"
                style={{ aspectRatio: '21 / 9' }}
              />
            </div>
            {imagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all aspect-video w-24 cursor-pointer ${
                      currentBanner === img ? 'border-rose-500 scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Hình ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Địa chỉ & Liên hệ
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">{cinema.address}</p>
              <div className="pt-2 border-t border-slate-800/60 flex flex-wrap gap-4 text-xs text-slate-400">
                <div>
                  Hotline: <strong className="text-white">{meta.hotline}</strong>
                </div>
                {meta.fax && (
                  <div>
                    Fax: <strong className="text-slate-300">{meta.fax}</strong>
                  </div>
                )}
                <div>
                  Khu vực: <strong className="text-rose-400">{meta.city}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" /> Đặc điểm & Tiện ích
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {meta.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                Rạp đạt tiêu chuẩn quốc tế với hệ thống âm thanh Dolby Surround 7.1, ghế ngồi bọc nệm cao cấp.
              </p>
            </div>
          </div>

          {/* Rooms list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-indigo-400" />
                Danh sách phòng chiếu ({rooms.length} phòng)
              </h3>
              <span className="text-xs text-slate-400">Tất cả phòng hoạt động 100%</span>
            </div>

            {loadingRooms ? (
              <div className="py-6 text-center text-sm text-slate-400">Đang tải danh sách phòng...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {rooms.map((room) => {
                  const isGoldClass = room.name.toLowerCase().includes('gold class');
                  const is3D = room.name.toLowerCase().includes('3d');
                  return (
                    <div
                      key={room.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                        isGoldClass
                          ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                          : is3D
                          ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">{room.name}</span>
                        {isGoldClass && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                        <span>Sẵn sàng phục vụ</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Google Maps Embed */}
          {meta.mapEmbedUrl && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-rose-500" /> Vị trí trên Google Maps
              </h4>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[21/9]">
                <iframe
                  title={`Bản đồ ${cinema.name}`}
                  src={meta.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-20 px-6 py-4 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <Link
            to={`/showtimes?cinemaId=${cinema.id}`}
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-colors flex items-center gap-2"
          >
            <Film className="w-4 h-4" />
            <span>Xem lịch chiếu & Đặt vé</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
