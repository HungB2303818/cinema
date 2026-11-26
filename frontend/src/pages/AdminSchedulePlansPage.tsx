import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  Edit2,
  Filter,
  ListChecks,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  GenerateScheduleModal,
  formatWeekdays,
  useAdminSchedulePlans,
  type SchedulePlanStatus,
  type SchedulePlanSummary,
} from '@/features/schedule-plans';
import { useAdminCinemas, useAdminRooms } from '@/features/cinemas';
import {
  AlertMessage,
  Button,
  EmptyState,
  LoadingSpinner,
  Pagination,
  StatusBadge,
} from '@/shared/components/ui';
import { formatDate } from '@/shared/utils/format';

export const AdminSchedulePlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [generatePlan, setGeneratePlan] = React.useState<SchedulePlanSummary | null>(null);

  const cinemaIdParam = searchParams.get('cinemaId');
  const roomIdParam = searchParams.get('roomId');
  const statusParam = searchParams.get('status') as SchedulePlanStatus | null;
  const pageParam = Math.max(parseInt(searchParams.get('page') || '0', 10) || 0, 0);

  const cinemaId = cinemaIdParam ? parseInt(cinemaIdParam, 10) : undefined;
  const roomId = roomIdParam ? parseInt(roomIdParam, 10) : undefined;
  const status = statusParam || undefined;

  const { data: cinemasData } = useAdminCinemas(0, 100, 'name,asc');
  const { data: roomsData } = useAdminRooms(cinemaId, 0, 100, 'name,asc');

  const { data, isLoading, isError, refetch } = useAdminSchedulePlans({
    cinemaId,
    roomId,
    status,
    page: pageParam,
    size: 20,
    sort: 'id,desc',
  });

  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    });
    if (!('page' in updates)) next.set('page', '0');
    setSearchParams(next);
  };

  const handleCinemaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    updateFilters({ cinemaId: value || null, roomId: null });
  };

  const resetAllFilters = () => setSearchParams(new URLSearchParams());

  const handlePageChange = (pageOneBased: number) => {
    updateFilters({ page: (pageOneBased - 1).toString() });
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="border-b border-[#20232e] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#e6e2c1] text-sm font-bold mb-1">
            <CalendarClock className="w-4 h-4" />
            <span>Quản trị lịch tự động</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Lịch chiếu tự động</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Hệ thống sinh suất trước 7 ngày theo khung giờ đã cấu hình.
          </p>
        </div>

        <Link to="/admin/schedule-plans/new">
          <Button variant="primary" className="flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            <span>Thêm lịch tự động</span>
          </Button>
        </Link>
      </div>

      <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
            <Filter className="w-4 h-4 text-[#e6e2c1]" />
            <span>Bộ lọc lịch tự động</span>
          </div>
          {(cinemaId || roomId || status) && (
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="planFilterCinema"
              className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
            >
              Cụm rạp
            </label>
            <select
              id="planFilterCinema"
              value={cinemaId || ''}
              onChange={handleCinemaChange}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors"
            >
              <option value="">Tất cả rạp</option>
              {cinemasData?.content.map((cinema) => (
                <option key={cinema.id} value={cinema.id}>
                  {cinema.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="planFilterRoom"
              className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
            >
              Phòng chiếu
            </label>
            <select
              id="planFilterRoom"
              value={roomId || ''}
              onChange={(event) => updateFilters({ roomId: event.target.value || null })}
              disabled={!cinemaId}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors disabled:opacity-40"
            >
              <option value="">{cinemaId ? 'Tất cả phòng' : 'Chọn rạp trước'}</option>
              {roomsData?.content.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="planFilterStatus"
              className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
            >
              Trạng thái
            </label>
            <select
              id="planFilterStatus"
              value={status || ''}
              onChange={(event) => updateFilters({ status: event.target.value || null })}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang bật</option>
              <option value="INACTIVE">Tạm dừng</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-8 space-y-3">
          <AlertMessage variant="error">Không thể tải danh sách lịch tự động.</AlertMessage>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !data?.content.length ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-12">
          <EmptyState
            icon={CalendarClock}
            title="Chưa có lịch tự động nào"
            description="Tạo lịch tự động để hệ thống sinh suất chiếu theo khung giờ và thứ đã cấu hình."
            action={
              <Link to="/admin/schedule-plans/new">
                <Button variant="primary" size="sm" className="mt-2">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Thêm lịch tự động
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
                  <th className="py-4 px-6">Tên</th>
                  <th className="py-4 px-6">Rạp &amp; Phòng</th>
                  <th className="py-4 px-6">Hiệu lực</th>
                  <th className="py-4 px-6">Thứ</th>
                  <th className="py-4 px-6">Giờ</th>
                  <th className="py-4 px-6">Bước slot</th>
                  <th className="py-4 px-6">Số phim</th>
                  <th className="py-4 px-6">Trạng thái</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202a]">
                {data.content.map((plan) => (
                  <tr key={plan.id} className="hover:bg-[#181a24] transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{plan.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">#{plan.id}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-zinc-200">{plan.cinemaName}</div>
                      <div className="text-xs text-[#e6e2c1] font-medium">{plan.roomName}</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300">
                      {formatDate(plan.effectiveFrom)} - {formatDate(plan.effectiveTo)}
                    </td>
                    <td className="py-4 px-6 text-xs font-semibold text-zinc-300">
                      {formatWeekdays(plan.daysOfWeek)}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-zinc-300">
                      {plan.openTime} - {plan.closeTime}
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300">{plan.slotStepMinutes} phút</td>
                    <td className="py-4 px-6 text-xs text-zinc-300">{plan.movieCount}</td>
                    <td className="py-4 px-6">
                      <StatusBadge
                        status={plan.status}
                        label={plan.status === 'ACTIVE' ? 'Đang bật' : 'Tạm dừng'}
                      />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          to={`/admin/schedule-plans/${plan.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-zinc-300 hover:text-white text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setGeneratePlan(plan)}
                          disabled={plan.status !== 'ACTIVE'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-[#e6e2c1] text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title={
                            plan.status === 'ACTIVE'
                              ? 'Sinh suất chiếu cho khoảng ngày'
                              : 'Kế hoạch đang tạm dừng'
                          }
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Sinh ngay</span>
                        </button>

                        <Link
                          to={`/admin/schedule-plans/${plan.id}/logs`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-zinc-300 hover:text-white text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors"
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          <span>Nhật ký</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="p-4 border-t border-[#242733] flex justify-center">
              <Pagination
                currentPage={data.page + 1}
                totalPages={data.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}

      <GenerateScheduleModal
        plan={generatePlan}
        isOpen={generatePlan !== null}
        onClose={() => setGeneratePlan(null)}
        onViewLogs={(planId) => navigate(`/admin/schedule-plans/${planId}/logs`)}
      />
    </div>
  );
};
