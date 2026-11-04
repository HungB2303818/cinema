import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Calendar, Film, Building2 } from 'lucide-react';
import { useShowtimes } from '@/features/showtimes';
import { formatDateTime, formatCurrency } from '@/shared/utils/format';
import { LoadingSpinner, EmptyState } from '@/shared/components/ui';

export const ShowtimesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const cinemaIdParam = searchParams.get('cinemaId');
  const movieIdParam = searchParams.get('movieId');

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const { data: showtimes = [], isLoading: loading } = useShowtimes({
    date: selectedDate,
    cinemaId: cinemaIdParam ? Number(cinemaIdParam) : undefined,
    movieId: movieIdParam ? Number(movieIdParam) : undefined,
  });

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20232e] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Lịch chiếu phim</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {cinemaIdParam ? 'Lịch chiếu tại cụm rạp đã chọn' : 'Chọn ngày để xem các suất chiếu khả dụng'}
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2 bg-[#13151d] border border-[#242733] rounded-full px-4 py-2">
          <Calendar className="w-4 h-4 text-[#e6e2c1]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-zinc-200 text-sm focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải lịch chiếu..." />
      ) : showtimes.length === 0 ? (
        <EmptyState
          icon={Film}
          title={`Không có suất chiếu nào trong ngày ${selectedDate}`}
          description="Vui lòng chọn ngày khác hoặc chuyển đổi cụm rạp để tìm suất chiếu phù hợp."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showtimes.map((st) => (
            <div
              key={st.id}
              className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 hover:border-[#e6e2c1]/60 transition-all flex flex-col justify-between space-y-6 shadow-xl shadow-black/40"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold text-[#e6e2c1] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {st.cinemaName || 'CGV Cinema'}
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-[#181a24] text-zinc-300 border-none font-medium">
                    {st.roomName || 'Phòng chiếu'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white line-clamp-1">
                  {st.movieTitle || 'Phim điện ảnh'}
                </h3>

                <div className="pt-2 flex items-center justify-between border-t border-[#20232e] text-sm">
                  <span className="text-zinc-400">Giờ chiếu:</span>
                  <span className="font-bold text-white text-base">
                    {formatDateTime(st.startsAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Giá vé cơ bản:</span>
                  <span className="text-[#e6e2c1] font-bold">{formatCurrency(st.basePrice)}</span>
                </div>
              </div>

              <Link
                to={`/movies/${st.movieId}`}
                className="block text-center py-2.5 px-4 text-xs font-bold rounded-full bg-[#e6e2c1] hover:bg-[#dad6b2] text-black transition-all shadow-md active:scale-[0.98] border-none"
              >
                Chọn vé suất này
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
