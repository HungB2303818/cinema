import React from 'react';
import { X, MapPin, Tv, Building2, AlertCircle } from 'lucide-react';
import type { Cinema } from '../types/cinema.types';
import { useCinemaDetail } from '../hooks/useCinemaDetail';
import { LoadingSpinner, ErrorState } from '@/shared/components/ui';

interface CinemaDetailModalProps {
  cinema: Cinema | null;
  onClose: () => void;
}

export const CinemaDetailModal: React.FC<CinemaDetailModalProps> = ({ cinema, onClose }) => {
  const {
    data: detail,
    isLoading,
    error,
    refetch,
  } = useCinemaDetail(cinema?.id ?? null);

  if (!cinema) return null;

  const rooms = detail?.rooms ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cinema-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#12141c] border border-[#242733] shadow-2xl text-zinc-100 flex flex-col">
        {/* Header with Close */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-[#12141c]/95 backdrop-blur border-b border-[#242733]">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#e6e2c1]" />
            <h2 id="cinema-modal-title" className="text-xl font-bold text-white">
              {cinema.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-[#1a1d28] transition-colors cursor-pointer border-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Address & Status */}
          <div className="p-4 rounded-2xl bg-[#090a0f]/80 border border-[#242733] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#e6e2c1] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> Địa chỉ rạp
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  cinema.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {cinema.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{cinema.address}</p>
          </div>

          {/* Rooms list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-zinc-400" />
                <span>Danh sách phòng chiếu ({rooms.length})</span>
              </h3>
            </div>

            {isLoading ? (
              <div className="py-8">
                <LoadingSpinner message="Đang tải danh sách phòng chiếu..." />
              </div>
            ) : error ? (
              <ErrorState
                title="Không thể tải danh sách phòng"
                message={error instanceof Error ? error.message : 'Đã có lỗi khi kết nối tới máy chủ.'}
                onRetry={() => refetch()}
              />
            ) : rooms.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#090a0f] border border-[#242733] text-center text-zinc-400 text-sm flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6 text-zinc-500" />
                <span>Chưa có thông tin phòng chiếu cho cụm rạp này.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-3.5 rounded-xl border bg-[#090a0f] border-[#242733] text-zinc-300 flex flex-col justify-between"
                  >
                    <span className="font-semibold text-sm text-white">{room.name}</span>
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          room.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      <span className="text-zinc-400">
                        {room.status === 'ACTIVE' ? 'Hoạt động' : 'Bảo trì'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-20 px-6 py-4 bg-[#12141c]/95 backdrop-blur border-t border-[#242733] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold rounded-full bg-[#181a24] hover:bg-[#222530] text-zinc-300 transition-colors cursor-pointer border-none"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
