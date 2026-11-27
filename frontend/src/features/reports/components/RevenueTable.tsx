import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Clock, Film, Filter, MapPin } from 'lucide-react';
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
  formatPercent,
  formatPeriod,
  formatReportGeneratedAt,
  isZeroMoney,
  toNumericMoney,
} from '../utils/report-format';
import { PAGE_SIZE_OPTIONS } from '../utils/report-filters';

export type BreakdownSortField = 'groupName' | 'totalRevenue' | 'successfulPayments' | 'ticketsSold';

export interface RevenueTableProps {
  tab: RevenueTab;
  timeGroup: RevenueTimeGroup;
  timeSeries: RevenueSeriesPoint[];
  totalRevenue?: string;
  breakdown: RevenueBreakdownResponse | null;
  sort?: string;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  generatedAt?: string;
  onTabChange: (tab: RevenueTab) => void;
  onSortChange?: (nextSort: string) => void;
  onDrillDown?: (tab: 'movie' | 'cinema', id: number) => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

const tabs: { key: RevenueTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'time', label: 'Theo thời gian', icon: Clock },
  { key: 'movie', label: 'Theo phim', icon: Film },
  { key: 'cinema', label: 'Theo rạp', icon: MapPin },
];

const thClass = 'py-3.5 px-5 text-xs font-bold text-zinc-300 tracking-wide';
const tdClass = 'py-3.5 px-5 text-sm text-zinc-200 tabular-nums';

const SkeletonRows: React.FC = () => (
  <tbody className="divide-y divide-[#1e202a]" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((index) => (
      <tr key={index} className="animate-pulse">
        <td className="py-4 px-5">
          <div className="h-3 w-40 rounded bg-[#242733]" />
        </td>
        <td className="py-4 px-5">
          <div className="h-3 w-24 rounded bg-[#242733] ml-auto" />
        </td>
        <td className="py-4 px-5">
          <div className="h-3 w-20 rounded bg-[#242733] ml-auto" />
        </td>
        <td className="py-4 px-5">
          <div className="h-3 w-16 rounded bg-[#242733] ml-auto" />
        </td>
        <td className="py-4 px-5">
          <div className="h-3 w-16 rounded bg-[#242733] ml-auto" />
        </td>
        <td className="py-4 px-5">
          <div className="h-3 w-20 rounded bg-[#242733] ml-auto" />
        </td>
      </tr>
    ))}
  </tbody>
);

const ShareBar: React.FC<{ ratio: number; isZero: boolean }> = ({ ratio, isZero }) => {
  const pct = Math.max(0, Math.min(1, ratio));
  const barColor = isZero
    ? 'bg-red-500/40'
    : pct >= 0.25
    ? 'bg-emerald-500'
    : pct >= 0.1
    ? 'bg-blue-500'
    : 'bg-amber-500';

  return (
    <div className="inline-flex items-center justify-end gap-2 min-w-[96px]">
      <div className="w-12 h-1.5 rounded-full bg-[#242733] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
      <span
        className={`text-xs font-semibold tabular-nums w-11 text-right ${
          isZero ? 'text-red-400' : 'text-zinc-200'
        }`}
      >
        {formatPercent(pct)}
      </span>
    </div>
  );
};

export const RevenueTable: React.FC<RevenueTableProps> = ({
  tab,
  timeGroup,
  timeSeries,
  totalRevenue = '0',
  breakdown,
  sort = 'totalRevenue,desc',
  isLoading,
  isError,
  isFetching = false,
  generatedAt,
  onTabChange,
  onSortChange,
  onDrillDown,
  onRetry,
  onPageChange,
  onSizeChange,
}) => {
  const rows = breakdown?.rows;
  const maxRows = 10;
  const timeSeriesKey = `${timeGroup}:${timeSeries.length}:${timeSeries[0]?.period ?? ''}:${
    timeSeries[timeSeries.length - 1]?.period ?? ''
  }`;
  const [timePageState, setTimePageState] = React.useState<{ key: string; page: number }>({
    key: timeSeriesKey,
    page: 0,
  });

  const timePage = timePageState.key === timeSeriesKey ? timePageState.page : 0;
  const timeTotalPages = Math.max(1, Math.ceil(timeSeries.length / maxRows));
  const safeTimePage = Math.min(timePage, timeTotalPages - 1);
  const visibleTimeSeries = React.useMemo(
    () => timeSeries.slice(safeTimePage * maxRows, (safeTimePage + 1) * maxRows),
    [timeSeries, safeTimePage]
  );
  const visibleBreakdownRows = React.useMemo(
    () => (rows?.content ?? []).slice(0, maxRows),
    [rows?.content]
  );

  const totalRevenueNum = toNumericMoney(totalRevenue);
  const timeSeriesTotals = React.useMemo(() => {
    let revenue = 0;
    let payments = 0;
    let tickets = 0;
    for (const p of timeSeries) {
      revenue += toNumericMoney(p.totalRevenue);
      payments += p.successfulPayments;
      tickets += p.ticketsSold;
    }
    return { revenue, payments, tickets };
  }, [timeSeries]);

  const effectiveTotal = totalRevenueNum > 0 ? totalRevenueNum : timeSeriesTotals.revenue;
  const timeHasNoRevenue =
    tab === 'time' && timeSeries.length > 0 && timeSeries.every((point) => isZeroMoney(point.totalRevenue));

  const [sortField, sortDir] = sort.split(',');

  const handleSortClick = (field: BreakdownSortField) => {
    if (!onSortChange) return;
    const nextDir = sortField === field && sortDir === 'desc' ? 'asc' : 'desc';
    onSortChange(`${field},${nextDir}`);
  };

  const renderSortIcon = (field: BreakdownSortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
    );
  };

  return (
    <section
      id="chi-tiet"
      aria-labelledby="revenueTableHeading"
      className="bg-[#13151d] border border-[#242733] rounded-2xl overflow-hidden shadow-xl shadow-black/20"
    >
      <div className="p-4 sm:p-5 border-b border-[#242733] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h2 id="revenueTableHeading" className="text-sm font-bold text-white">
            Bảng dữ liệu chi tiết
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isFetching && (
            <span className="text-xs font-semibold text-blue-300" role="status">
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    active ? 'bg-blue-500 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
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
            <div className="px-5 pt-4">
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
                    Tỷ trọng
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    Giao dịch thành công
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    Vé đã bán
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    BQ / giao dịch
                  </th>
                </tr>
              </thead>
              {isLoading && timeSeries.length === 0 ? (
                <SkeletonRows />
              ) : (
                <>
                  <tbody className="divide-y divide-[#1e202a]">
                    {visibleTimeSeries.map((point) => {
                      const revNum = toNumericMoney(point.totalRevenue);
                      const zero = isZeroMoney(point.totalRevenue);
                      const share = effectiveTotal > 0 ? revNum / effectiveTotal : 0;
                      const avgPerPay =
                        point.successfulPayments > 0
                          ? (revNum / point.successfulPayments).toFixed(0)
                          : '0';

                      return (
                        <tr key={point.period} className="hover:bg-[#181a24] transition-colors">
                          <th scope="row" className={`${tdClass} text-left font-semibold text-white`}>
                            {formatPeriod(point.period, timeGroup)}
                          </th>
                          <td
                            className={`${tdClass} text-right font-semibold ${
                              zero ? 'text-red-400' : 'text-emerald-300'
                            }`}
                          >
                            {formatMoneyString(point.totalRevenue)}
                          </td>
                          <td className={`${tdClass} text-right`}>
                            <ShareBar ratio={share} isZero={zero} />
                          </td>
                          <td className={`${tdClass} text-right text-blue-300`}>
                            {formatCount(point.successfulPayments)}
                          </td>
                          <td className={`${tdClass} text-right text-amber-300`}>
                            {formatCount(point.ticketsSold)}
                          </td>
                          <td className={`${tdClass} text-right text-violet-300`}>
                            {point.successfulPayments > 0 ? formatMoneyString(avgPerPay) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {timeSeries.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#2d3142] bg-[#0c0d12] font-bold">
                        <th scope="row" className={`${tdClass} text-left text-white`}>
                          Tổng cộng ({formatCount(timeSeries.length)} mốc)
                        </th>
                        <td className={`${tdClass} text-right text-emerald-300`}>
                          {formatMoneyString(timeSeriesTotals.revenue.toFixed(2))}
                        </td>
                        <td className={`${tdClass} text-right text-zinc-200`}>100%</td>
                        <td className={`${tdClass} text-right text-blue-300`}>
                          {formatCount(timeSeriesTotals.payments)}
                        </td>
                        <td className={`${tdClass} text-right text-amber-300`}>
                          {formatCount(timeSeriesTotals.tickets)}
                        </td>
                        <td className={`${tdClass} text-right text-violet-300`}>
                          {timeSeriesTotals.payments > 0
                            ? formatMoneyString(
                                (timeSeriesTotals.revenue / timeSeriesTotals.payments).toFixed(0)
                              )
                            : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </>
              )}
            </table>
          </div>
          <div className="px-5 py-3.5 border-t border-[#242733] flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <span>
                Hiển thị {formatCount(visibleTimeSeries.length)} / {formatCount(timeSeries.length)} mốc
              </span>
              {generatedAt && <span>Thời điểm tạo: {formatReportGeneratedAt(generatedAt)}</span>}
            </div>
            {timeSeries.length > maxRows && (
              <div className="flex justify-end print:hidden">
                <Pagination
                  currentPage={safeTimePage + 1}
                  totalPages={timeTotalPages}
                  onPageChange={(pageOneBased) =>
                    setTimePageState({ key: timeSeriesKey, page: pageOneBased - 1 })
                  }
                />
              </div>
            )}
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
                        <button
                          type="button"
                          onClick={() => handleSortClick('groupName')}
                          className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer"
                        >
                          <span>{tab === 'movie' ? 'Phim' : 'Rạp'}</span>
                          {renderSortIcon('groupName')}
                        </button>
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        <button
                          type="button"
                          onClick={() => handleSortClick('totalRevenue')}
                          className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer ml-auto"
                        >
                          <span>Doanh thu</span>
                          {renderSortIcon('totalRevenue')}
                        </button>
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        Tỷ trọng
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        <button
                          type="button"
                          onClick={() => handleSortClick('successfulPayments')}
                          className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer ml-auto"
                        >
                          <span>Giao dịch thành công</span>
                          {renderSortIcon('successfulPayments')}
                        </button>
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        <button
                          type="button"
                          onClick={() => handleSortClick('ticketsSold')}
                          className="inline-flex items-center gap-1.5 hover:text-white cursor-pointer ml-auto"
                        >
                          <span>Vé đã bán</span>
                          {renderSortIcon('ticketsSold')}
                        </button>
                      </th>
                      <th scope="col" className={`${thClass} text-right`}>
                        BQ / giao dịch
                      </th>
                    </tr>
                  </thead>
                  {isLoading && !rows ? (
                    <SkeletonRows />
                  ) : rows && visibleBreakdownRows.length > 0 ? (
                    <tbody className="divide-y divide-[#1e202a]">
                      {visibleBreakdownRows.map((row) => {
                        const revNum = toNumericMoney(row.totalRevenue);
                        const zero = isZeroMoney(row.totalRevenue);
                        const share = effectiveTotal > 0 ? revNum / effectiveTotal : 0;
                        const avgPerPay =
                          row.successfulPayments > 0
                            ? (revNum / row.successfulPayments).toFixed(0)
                            : '0';

                        return (
                          <tr key={row.groupId} className="hover:bg-[#181a24] transition-colors">
                            <th scope="row" className={`${tdClass} text-left font-semibold`}>
                              <div className="flex items-center gap-2">
                                <span className="text-white">{row.groupName}</span>
                                {onDrillDown && (
                                  <button
                                    type="button"
                                    onClick={() => onDrillDown(tab, row.groupId)}
                                    title={`Lọc báo cáo theo ${tab === 'movie' ? 'phim' : 'rạp'} này`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-[11px] font-semibold cursor-pointer print:hidden"
                                  >
                                    <Filter className="w-3 h-3" />
                                    <span>Lọc</span>
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono">
                                #{row.groupId}
                              </div>
                            </th>
                            <td
                              className={`${tdClass} text-right font-semibold ${
                                zero ? 'text-red-400' : 'text-emerald-300'
                              }`}
                            >
                              {formatMoneyString(row.totalRevenue)}
                            </td>
                            <td className={`${tdClass} text-right`}>
                              <ShareBar ratio={share} isZero={zero} />
                            </td>
                            <td className={`${tdClass} text-right text-blue-300`}>
                              {formatCount(row.successfulPayments)}
                            </td>
                            <td className={`${tdClass} text-right text-amber-300`}>
                              {formatCount(row.ticketsSold)}
                            </td>
                            <td className={`${tdClass} text-right text-violet-300`}>
                              {row.successfulPayments > 0 ? formatMoneyString(avgPerPay) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  ) : (
                    <tbody>
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-400">
                          Không có giao dịch thành công trong khoảng đã chọn.
                        </td>
                      </tr>
                    </tbody>
                  )}
                </table>
              </div>

              {rows && (
                <div className="px-5 py-4 border-t border-[#242733] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                    <span>Tổng số nhóm: {formatCount(rows.totalElements)}</span>
                    {generatedAt && <span>Thời điểm tạo: {formatReportGeneratedAt(generatedAt)}</span>}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400">
                      Số dòng/trang
                      <select
                        value={rows.size}
                        onChange={(event) => onSizeChange(Number(event.target.value))}
                        className="px-2 py-1 bg-[#090a0f] border border-[#252836] rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-blue-400"
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
