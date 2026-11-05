import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Calendar, Plus, Edit2, Grid, Filter, RotateCcw } from 'lucide-react';
import { useAdminShowtimes, type ShowtimeStatus } from '@/features/showtimes';
import { useAdminCinemas, useAdminRooms } from '@/features/cinemas';
import { useAdminMovies } from '@/features/movies';
import {
  Button,
  Pagination,
  StatusBadge,
  AlertMessage,
  LoadingSpinner,
  EmptyState,
} from '@/shared/components/ui';
import { formatCurrency, formatDateTime } from '@/shared/utils/format';

export const AdminShowtimesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL search params
  const cinemaIdParam = searchParams.get('cinemaId');
  const roomIdParam = searchParams.get('roomId');
  const movieIdParam = searchParams.get('movieId');
  const dateParam = searchParams.get('date');
  const statusParam = searchParams.get('status') as ShowtimeStatus | null;
  const pageParam = parseInt(searchParams.get('page') || '0', 10);

  const cinemaId = cinemaIdParam ? parseInt(cinemaIdParam, 10) : undefined;
  const roomId = roomIdParam ? parseInt(roomIdParam, 10) : undefined;
  const movieId = movieIdParam ? parseInt(movieIdParam, 10) : undefined;
  const date = dateParam || undefined;
  const status = statusParam || undefined;

  // Query lookups for filters
  const { data: cinemasData } = useAdminCinemas(0, 100, 'name,asc');
  const { data: roomsData } = useAdminRooms(cinemaId, 0, 100, 'name,asc');
  const { data: moviesData } = useAdminMovies({ size: 100 });

  // Query admin showtimes
  const {
    data: showtimesData,
    isLoading,
    isError,
    refetch,
  } = useAdminShowtimes({
    cinemaId,
    roomId,
    movieId,
    date,
    status,
    page: pageParam,
    size: 20,
    sort: 'startsAt,asc',
  });

  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    // Reset page to 0 when any filter changes, unless page itself is updated
    if (!('page' in updates)) {
      next.set('page', '0');
    }
    setSearchParams(next);
  };

  const handleCinemaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    // When changing cinema, reset roomId because room may not belong to new cinema
    updateFilters({ cinemaId: val ? val : null, roomId: null });
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateFilters({ roomId: val ? val : null });
  };

  const handleMovieChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateFilters({ movieId: val ? val : null });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    updateFilters({ date: val ? val : null });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateFilters({ status: val ? val : null });
  };

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPageOneBased: number) => {
    updateFilters({ page: (newPageOneBased - 1).toString() });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-[#20232e] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#e6e2c1] text-sm font-bold mb-1">
            <Calendar className="w-4 h-4" />
            <span>Quản trị Lịch Chiếu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Quản lý Suất Chiếu</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Tra cứu toàn bộ lịch chiếu theo rạp, phòng, phim và ngày; kiểm soát trạng thái và giá vé
          </p>
        </div>

        <Link to="/admin/showtimes/new">
          <Button variant="primary" className="flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            <span>Thêm suất chiếu mới</span>
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
            <Filter className="w-4 h-4 text-[#e6e2c1]" />
            <span>Bộ lọc lịch chiếu</span>
          </div>
          {(cinemaId || roomId || movieId || date || status) && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 text-xs text-[#e6e2c1] hover:underline font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Cinema */}
          <div>
            <label htmlFor="filterCinema" className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Cụm rạp
            </label>
            <select
              id="filterCinema"
              value={cinemaId || ''}
              onChange={handleCinemaChange}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors"
            >
              <option value="">Tất cả rạp</option>
              {cinemasData?.content.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room */}
          <div>
            <label htmlFor="filterRoom" className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Phòng chiếu
            </label>
            <select
              id="filterRoom"
              value={roomId || ''}
              onChange={handleRoomChange}
              disabled={!cinemaId}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors disabled:opacity-40"
            >
              <option value="">{cinemaId ? 'Tất cả phòng' : 'Chọn rạp trước'}</option>
              {roomsData?.content.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.status})
                </option>
              ))}
            </select>
          </div>

          {/* Movie */}
          <div>
            <label htmlFor="filterMovie" className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Phim
            </label>
            <select
              id="filterMovie"
              value={movieId || ''}
              onChange={handleMovieChange}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors"
            >
              <option value="">Tất cả phim</option>
              {moviesData?.content.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="filterDate" className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Ngày chiếu (VN)
            </label>
            <input
              id="filterDate"
              type="date"
              value={date || ''}
              onChange={handleDateChange}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="filterStatus" className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Trạng thái
            </label>
            <select
              id="filterStatus"
              value={status || ''}
              onChange={handleStatusChange}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="SCHEDULED">SCHEDULED (Đã lên lịch)</option>
              <option value="CANCELLED">CANCELLED (Đã hủy)</option>
              <option value="COMPLETED">COMPLETED (Đã kết thúc)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Showtime Table */}
      {isLoading ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-8 space-y-3">
          <AlertMessage variant="error">Không thể tải danh sách suất chiếu admin.</AlertMessage>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !showtimesData?.content.length ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-12">
          <EmptyState
            icon={Calendar}
            title="Không tìm thấy suất chiếu nào"
            description="Không có suất chiếu nào phù hợp với điều kiện lọc hiện tại hoặc chưa có suất chiếu được tạo."
            action={
              <Link to="/admin/showtimes/new">
                <Button variant="primary" size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Thêm suất chiếu mới
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#242733] bg-[#0c0d12] text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Mã</th>
                  <th className="py-4 px-6">Phim</th>
                  <th className="py-4 px-6">Rạp & Phòng</th>
                  <th className="py-4 px-6">Thời gian chiếu (VN)</th>
                  <th className="py-4 px-6">Dọn phòng</th>
                  <th className="py-4 px-6">Giá vé (VND)</th>
                  <th className="py-4 px-6">Trạng thái</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202a]">
                {showtimesData.content.map((showtime) => {
                  const movie = moviesData?.content.find((m) => m.id === showtime.movieId);
                  return (
                    <tr key={showtime.id} className="hover:bg-[#181a24] transition-colors">
                      <td className="py-4 px-6 font-mono text-zinc-400 font-semibold">
                        #{showtime.id}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white line-clamp-1">
                          {movie?.title || `Phim #${showtime.movieId}`}
                        </div>
                        {movie?.durationMinutes && (
                          <span className="text-[11px] text-zinc-400">
                            {movie.durationMinutes} phút
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-zinc-200">{showtime.cinemaName}</div>
                        <div className="text-xs text-[#e6e2c1] font-medium">{showtime.roomName}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">{formatDateTime(showtime.startsAt)}</div>
                        <div className="text-xs text-zinc-400">đến {formatDateTime(showtime.endsAt)}</div>
                      </td>
                      <td className="py-4 px-6 text-zinc-300 font-mono text-xs">
                        +{showtime.cleanupMinutes}m
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{formatCurrency(showtime.basePrice)}</div>
                        {showtime.vipSurcharge > 0 && (
                          <div className="text-[11px] text-amber-300">
                            VIP: +{formatCurrency(showtime.vipSurcharge)}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={showtime.status} size="sm" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/showtimes/${showtime.id}/seats`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-[#e6e2c1] text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors"
                            title="Xem tồn kho ghế của suất"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Grid className="w-3.5 h-3.5" />
                            <span>Tồn kho</span>
                          </Link>

                          <Link
                            to={`/admin/showtimes/${showtime.id}/edit`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-zinc-300 hover:text-white text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors"
                            title="Sửa suất chiếu"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showtimesData.totalPages > 1 && (
            <div className="p-4 border-t border-[#242733] flex justify-center">
              <Pagination
                currentPage={showtimesData.page + 1}
                totalPages={showtimesData.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
