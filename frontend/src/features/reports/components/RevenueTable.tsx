import React from 'react';
import { BarChart3, Clock, Film, MapPin } from 'lucide-react';
import { AlertMessage, Button, Pagination } from '@/shared/components/ui';
import type {
  RevenueBreakdownResponse,
  RevenueSeriesPoint,
  RevenueTab,
  RevenueTimeGroup,
} from '../types/report.types';
import {
  formatCount,
  formatMoneyString,
  formatPeriod,
  formatReportGeneratedAt,
  isZeroMoney,
} from '../utils/report-format';
import { PAGE_SIZE_OPTIONS } from '../utils/report-filters';

export interface RevenueTableProps {
  tab: RevenueTab;
  timeGroup: RevenueTimeGroup;
  timeSeries: RevenueSeriesPoint[];
  breakdown: RevenueBreakdownResponse | null;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  generatedAt?: string;
  onTabChange: (tab: RevenueTab) => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

const tabs: { key: RevenueTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'time', label: 'Theo thời gian', icon: Clock },
  { key: 'movie', label: 'Theo phim', icon: Film },
  { key: 'cinema', label: 'Theo rạp', icon: MapPin },
];

const thClass = 'py-4 px-6 text-xs font-bold text-zinc-400 uppercase tracking-wider';
const tdClass = 'py-4 px-6 text-sm text-zinc-200';

const SkeletonRows: React.FC = () => (
  <tbody className="divide-y divide-[#1e202a]" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((index) => (
      <tr key={index} className="animate-pulse">
        <td className="py-4 px-6">
          <div className="h-3 w-40 rounded bg-[#242733]" />
        </td>
        <td className="py-4 px-6">
          <div className="h-3 w-24 rounded bg-[#242733]" />
        </td>
        <td className="py-4 px-6">
          <div className="h-3 w-16 rounded bg-[#242733]" />
        </td>
        <td className="py-4 px-6">
          <div className="h-3 w-16 rounded bg-[#242733]" />
        </td>
      </tr>
    ))}
  </tbody>
);

export const RevenueTable: React.FC<RevenueTableProps> = ({
  tab,
  timeGroup,
  timeSeries,
  breakdown,
  isLoading,
  isError,
  isFetching = false,
  generatedAt,
  onTabChange,
  onRetry,
  onPageChange,
  onSizeChange,
}) => {
  const rows = breakdown?.rows;
  const timeHasNoRevenue =
    tab === 'time' && timeSeries.length > 0 && timeSeries.every((point) => isZeroMoney(point.totalRevenue));

  return (
    <section
      aria-labelledby="revenueTableHeading"
      className="bg-[#13151d] border border-[#242733] rounded-2xl overflow-hidden shadow-xl shadow-black/20"
    >
      <div className="p-4 sm:p-5 border-b border-[#242733] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#e6e2c1]" />
          <h2 id="revenueTableHeading" className="text-sm font-bold text-zinc-200">
            Bảng dữ liệu
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isFetching && (
            <span className="text-[11px] font-semibold text-zinc-400" role="status">
              Đang cập nhật...
            </span>
          )}
          <div
            role="tablist"
            aria-label="Nhóm dữ liệu báo cáo"
            className="inline-flex rounded-full bg-[#0c0d12] border border-[#242733] p-1"
          >
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onTabChange(item.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                    active ? 'bg-[#e6e2c1] text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === 'time' ? (
        <div role="tabpanel" aria-label="Báo cáo theo thời gian">
          {timeHasNoRevenue && (
            <div className="px-6 pt-4">
              <AlertMessage variant="info">
                Không có giao dịch thành công trong khoảng đã chọn. Các mốc bên dưới vẫn hiển thị
                với doanh thu 0.
              </AlertMessage>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">
                Doanh thu theo {timeGroup === 'DAY' ? 'ngày' : 'tháng'} trong khoảng đã chọn
              </caption>
              <thead>
                <tr className="border-b border-[#242733] bg-[#0c0d12]">
                  <th scope="col" className={thClass}>
                    Mốc thời gian
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    Doanh thu
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    Giao dịch thành công
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    Vé đã bán
                  </th>
                </tr>
              </thead>
              {isLoading && timeSeries.length === 0 ? (
                <SkeletonRows />
              ) : (
                <tbody className="divide-y divide-[#1e202a]">
                  {timeSeries.map((point) => (
                    <tr key={point.period} className="hover:bg-[#181a24] transition-colors">
                      <th scope="row" className={`${tdClass} text-left font-semibold`}>
                        {formatPeriod(point.period, timeGroup)}
                      </th>
                      <td className={`${tdClass} text-right font-mono`}>
                        {formatMoneyString(point.totalRevenue)}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        {formatCount(point.successfulPayments)}
                      </td>
                      <td className={`${tdClass} text-right`}>{formatCount(point.ticketsSold)}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
          <div className="px-6 py-4 border-t border-[#242733] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
            <span>Số mốc: {formatCount(timeSeries.length)}</span>
            {generatedAt && <span>Thời điểm tạo: {formatReportGeneratedAt(generatedAt)}</span>}
          </div>
        </div>
      ) : (
        <div role="tabpanel" aria-label={`Báo cáo theo ${tab === 'movie' ? 'phim' : 'rạp'}`}>
          {isError ? (
            <div className="p-6 space-y-3">
              <AlertMessage variant="error">
                Không thể tải bảng thống kê. Số liệu không được thay bằng báo cáo rỗng.
              </AlertMessage>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Thử lại
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">
                    Doanh thu theo {tab === 'movie' ? 'phim' : 'rạp'} trong khoảng đã chọn
                  </caption>
                  <thead>
                    <tr className="border-b border-[#242733] bg-[#0c0d12]">
                      <th scope="col" className={thClass}>
                        {tab === 'movie' ? 'Phim' : 'Rạp'}
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        Doanh thu
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        Giao dịch thành công
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        Vé đã bán
                      </th>
                    </tr>
                  </thead>
                  {isLoading && !rows ? (
                    <SkeletonRows />
                  ) : rows && rows.content.length > 0 ? (
                    <tbody className="divide-y divide-[#1e202a]">
                      {rows.content.map((row) => (
                        <tr key={row.groupId} className="hover:bg-[#181a24] transition-colors">
                          <th scope="row" className={`${tdClass} text-left font-semibold`}>
                            <div>{row.groupName}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                              #{row.groupId}
                            </div>
                          </th>
                          <td className={`${tdClass} text-right font-mono`}>
                            {formatMoneyString(row.totalRevenue)}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            {formatCount(row.successfulPayments)}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            {formatCount(row.ticketsSold)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ) : (
                    <tbody>
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500">
                          Không có giao dịch thành công trong khoảng đã chọn.
                        </td>
                      </tr>
                    </tbody>
                  )}
                </table>
              </div>

              {rows && (
                <div className="px-6 py-4 border-t border-[#242733] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-500">
                    <span>Tổng số nhóm: {formatCount(rows.totalElements)}</span>
                    {generatedAt && <span>Thời điểm tạo: {formatReportGeneratedAt(generatedAt)}</span>}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
                      Số dòng/trang
                      <select
                        value={rows.size}
                        onChange={(event) => onSizeChange(Number(event.target.value))}
                        className="px-2 py-1 bg-[#090a0f] border border-[#252836] rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-[#e6e2c1]"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Pagination
                      currentPage={rows.page + 1}
                      totalPages={rows.totalPages}
                      onPageChange={(pageOneBased) => onPageChange(pageOneBased - 1)}
                      disabled={isFetching}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};
