import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, ExternalLink, Filter, RotateCcw } from 'lucide-react';
import {
  formatWeekdays,
  useAdminSchedulePlanDetail,
  useSchedulePlanLogs,
} from '@/features/schedule-plans';
import {
  AlertMessage,
  Button,
  EmptyState,
  LoadingSpinner,
  Pagination,
  StatusBadge,
} from '@/shared/components/ui';
import { formatDate, formatDateTime } from '@/shared/utils/format';

export const AdminSchedulePlanLogsPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const numericPlanId = planId ? parseInt(planId, 10) : undefined;
  const [searchParams, setSearchParams] = useSearchParams();

  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const pageParam = Math.max(parseInt(searchParams.get('page') || '0', 10) || 0, 0);

  const {
    data: plan,
    isLoading: isLoadingPlan,
    isError: isPlanError,
  } = useAdminSchedulePlanDetail(numericPlanId);
  const {
    data: logsData,
    isLoading: isLoadingLogs,
    isError: isLogsError,
    refetch,
  } = useSchedulePlanLogs(numericPlanId, { from, to, page: pageParam, size: 20 });

  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    });
    if (!('page' in updates)) next.set('page', '0');
    setSearchParams(next);
  };

  const handlePageChange = (pageOneBased: number) => {
    updateFilters({ page: (pageOneBased - 1).toString() });
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="border-b border-[#20232e] pb-6">
        <Link
          to="/admin/schedule-plans"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-[#e6e2c1] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại danh sách
        </Link>
        <div className="flex items-center gap-2 text-[#e6e2c1] text-sm font-bold mb-1">
          <CalendarClock className="w-4 h-4" />
          <span>Nhật ký sinh lịch</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Nhật ký lịch tự động</h1>
      </div>

      {isLoadingPlan ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : isPlanError || !plan ? (
        <AlertMessage variant="error">Không thể tải kế hoạch lịch tự động.</AlertMessage>
      ) : (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">{plan.name}</h2>
              <p className="text-xs text-zinc-400 mt-1">
                {plan.cinemaName} · {plan.roomName} · {plan.movieCount} phim
              </p>
            </div>
            <StatusBadge
              status={plan.status}
              label={plan.status === 'ACTIVE' ? 'Đang bật' : 'Tạm dừng'}
              size="md"
            />
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 uppercase tracking-wider font-bold">Hiệu lực</dt>
              <dd className="text-zinc-200 mt-0.5">
                {formatDate(plan.effectiveFrom)} - {formatDate(plan.effectiveTo)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 uppercase tracking-wider font-bold">Thứ</dt>
              <dd className="text-zinc-200 mt-0.5">{formatWeekdays(plan.daysOfWeek)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 uppercase tracking-wider font-bold">Khung giờ</dt>
              <dd className="text-zinc-200 mt-0.5 font-mono">
                {plan.openTime} - {plan.closeTime}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 uppercase tracking-wider font-bold">Bước slot</dt>
              <dd className="text-zinc-200 mt-0.5">{plan.slotStepMinutes} phút</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
            <Filter className="w-4 h-4 text-[#e6e2c1]" />
            <span>Bộ lọc nhật ký</span>
          </div>
          {(from || to) && (
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="inline-flex items-center gap-1.5 text-xs text-[#e6e2c1] hover:underline font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="logFrom"
              className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
            >
              Từ ngày
            </label>
            <input
              id="logFrom"
              type="date"
              value={from || ''}
              onChange={(event) => updateFilters({ from: event.target.value || null })}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="logTo"
              className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
            >
              Đến ngày
            </label>
            <input
              id="logTo"
              type="date"
              value={to || ''}
              min={from}
              onChange={(event) => updateFilters({ to: event.target.value || null })}
              className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1] transition-colors"
            />
          </div>
        </div>
      </div>

      {isLoadingLogs ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : isLogsError ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-8 space-y-3">
          <AlertMessage variant="error">Không thể tải nhật ký sinh lịch.</AlertMessage>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !logsData?.content.length ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-12">
          <EmptyState
            icon={CalendarClock}
            title="Chưa có nhật ký"
            description="Chưa có lần sinh lịch nào trong khoảng ngày đã chọn."
          />
        </div>
      ) : (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#242733] bg-[#0c0d12] text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Ngày</th>
                  <th className="py-4 px-6">Kết quả</th>
                  <th className="py-4 px-6">Đã tạo</th>
                  <th className="py-4 px-6">Bỏ qua</th>
                  <th className="py-4 px-6">Ghi chú</th>
                  <th className="py-4 px-6">Thời điểm chạy</th>
                  <th className="py-4 px-6 text-right">Suất chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e202a]">
                {logsData.content.map((log) => (
                  <tr key={log.id} className="hover:bg-[#181a24] transition-colors">
                    <td className="py-4 px-6 font-semibold text-zinc-100">
                      {formatDate(log.targetDate)}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={log.outcome} />
                    </td>
                    <td className="py-4 px-6 text-zinc-300">{log.createdCount}</td>
                    <td className="py-4 px-6 text-zinc-300">{log.skippedCount}</td>
                    <td className="py-4 px-6 text-xs text-zinc-400 max-w-xs">
                      {log.message || '—'}
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-400">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/admin/showtimes?roomId=${plan?.roomId ?? ''}&date=${log.targetDate}&planId=${plan?.id ?? ''}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-[#e6e2c1] text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem suất chiếu</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logsData.totalPages > 1 && (
            <div className="p-4 border-t border-[#242733] flex justify-center">
              <Pagination
                currentPage={logsData.page + 1}
                totalPages={logsData.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
