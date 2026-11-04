import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Calendar, Film, Building2 } from 'lucide-react';
import { useShowtimes } from '@/features/showtimes';
import { formatDateTime, formatCurrency } from '@/shared/utils/format';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Lịch chiếu phim</h1>
          <p className="text-slate-400 text-sm mt-1">
            {cinemaIdParam ? 'Lịch chiếu tại cụm rạp đã chọn' : 'Chọn ngày để xem các suất chiếu khả dụng'}
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-rose-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-slate-200 text-sm focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải lịch chiếu..." />
      ) : showtimes.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <Film className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
          <p className="text-slate-400 text-sm">Không có suất chiếu nào trong ngày {selectedDate}.</p>
          <p className="text-slate-500 text-xs">Vui lòng chọn ngày khác hoặc đổi cụm rạp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showtimes.map((st) => (
            <div
              key={st.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-rose-500/50 transition-all flex flex-col justify-between space-y-6 shadow-lg shadow-black/30"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-rose-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {st.cinemaName || 'CGV Cinema'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {st.roomName || 'Phòng chiếu'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white line-clamp-1">
                  {st.movieTitle || 'Phim điện ảnh'}
                </h3>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-sm">
                  <span className="text-slate-400">Giờ chiếu:</span>
                  <span className="font-bold text-white text-base">
                    {formatDateTime(st.startsAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Giá vé cơ bản:</span>
                  <span className="text-rose-400 font-semibold">{formatCurrency(st.basePrice)}</span>
                </div>
              </div>

              <Link
                to={`/movies/${st.movieId}`}
                className="block text-center py-2.5 px-4 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-md shadow-rose-950/30"
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
