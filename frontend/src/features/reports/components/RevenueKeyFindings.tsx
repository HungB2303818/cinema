import React from 'react';
import { AlertTriangle, Award, Calculator, TrendingUp } from 'lucide-react';
import type {
  RevenueBreakdownRow,
  RevenueSeriesPoint,
  RevenueSummary,
  RevenueTimeGroup,
} from '../types/report.types';
import {
  formatCount,
  formatMoneyString,
  formatPercent,
  formatPeriod,
  toNumericMoney,
} from '../utils/report-format';

export interface RevenueKeyFindingsProps {
  summary: RevenueSummary | null;
  timeSeries: RevenueSeriesPoint[];
  timeGroup: RevenueTimeGroup;
  topMovie?: RevenueBreakdownRow | null;
  topCinema?: RevenueBreakdownRow | null;
  isLoading: boolean;
}

export const RevenueKeyFindings: React.FC<RevenueKeyFindingsProps> = ({
  summary,
  timeSeries,
  timeGroup,
  topMovie = null,
  topCinema = null,
  isLoading,
}) => {
  if (isLoading && !summary) {
    return (
      <div
        className="h-32 rounded-2xl bg-[#13151d] border border-[#242733] animate-pulse"
        aria-hidden="true"
      />
    );
  }

  if (!summary || timeSeries.length === 0) return null;

  const totalRevenue = toNumericMoney(summary.totalRevenue);
  const unitLabel = timeGroup === 'DAY' ? 'ngày' : 'tháng';
  const avgPerPeriod = timeSeries.length > 0 ? totalRevenue / timeSeries.length : 0;

  let peakPoint: RevenueSeriesPoint | null = null;
  let peakValue = 0;
  let zeroCount = 0;

  for (const point of timeSeries) {
    const val = toNumericMoney(point.totalRevenue);
    if (val <= 0) {
      zeroCount += 1;
    }
    if (val > peakValue) {
      peakValue = val;
      peakPoint = point;
    }
  }

  const peakVsAvg = avgPerPeriod > 0 && peakValue > 0 ? (peakValue - avgPerPeriod) / avgPerPeriod : 0;
  const topMovieShare =
    topMovie && totalRevenue > 0 ? toNumericMoney(topMovie.totalRevenue) / totalRevenue : 0;
  const topCinemaShare =
    topCinema && totalRevenue > 0 ? toNumericMoney(topCinema.totalRevenue) / totalRevenue : 0;

  return (
    <section
      id="nhan-dinh"
      aria-labelledby="revenueHighlightsHeading"
      className="bg-[#13151d] border border-[#242733] rounded-2xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="revenueHighlightsHeading" className="text-sm font-bold text-white">
          Nhận định nổi bật
        </h2>
        <span className="text-xs text-zinc-400">
          Tóm tắt tự động trên {formatCount(timeSeries.length)} {unitLabel} trong kỳ
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Peak Period - Green */}
        <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Đỉnh doanh thu</span>
          </div>
          {peakPoint ? (
            <>
              <p className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
                {formatMoneyString(peakPoint.totalRevenue)}
              </p>
              <p className="text-xs text-zinc-300">
                {formatPeriod(peakPoint.period, timeGroup)} ({formatCount(peakPoint.ticketsSold)} vé
                {peakVsAvg > 0 ? `, +${formatPercent(peakVsAvg, 0)} so với TB` : ''})
              </p>
            </>
          ) : (
            <p className="text-sm font-bold text-zinc-400">Chưa phát sinh doanh thu</p>
          )}
        </div>

        {/* Average per Period - Blue */}
        <div className="rounded-xl bg-blue-500/8 border border-blue-500/25 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
            <Calculator className="w-3.5 h-3.5" />
            <span>Bình quân mỗi {unitLabel}</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
            {formatMoneyString(avgPerPeriod.toFixed(0))}
          </p>
          <p className="text-xs text-zinc-300">
            Trung bình {(summary.ticketsSold / timeSeries.length).toFixed(1).replace('.', ',')} vé /{' '}
            {unitLabel}
          </p>
        </div>

        {/* Zero Revenue / Risk Alert - Red or Green */}
        <div
          className={`rounded-xl p-4 space-y-2 border ${
            zeroCount > 0
              ? 'bg-red-500/8 border-red-500/25'
              : 'bg-emerald-500/8 border-emerald-500/25'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              zeroCount > 0 ? 'text-red-300' : 'text-emerald-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{zeroCount > 0 ? 'Mốc không có doanh thu' : 'Phủ đều toàn kỳ'}</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
            {zeroCount > 0
              ? `${formatCount(zeroCount)} / ${formatCount(timeSeries.length)} ${unitLabel}`
              : '100%'}
          </p>
          <p className="text-xs text-zinc-300">
            {zeroCount > 0
              ? `Chiếm ${formatPercent(zeroCount / timeSeries.length, 0)} tổng số mốc thời gian`
              : `Toàn bộ ${formatCount(timeSeries.length)} ${unitLabel} đều có giao dịch`}
          </p>
        </div>

        {/* Top Contributor - Amber */}
        <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <Award className="w-3.5 h-3.5" />
            <span>Dẫn đầu tỷ trọng</span>
          </div>
          {topMovie || topCinema ? (
            <div className="space-y-1.5">
              {topMovie && (
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-zinc-300 truncate" title={topMovie.groupName}>
                    <span className="text-zinc-400">Phim: </span>
                    <strong className="text-white">{topMovie.groupName}</strong>
                  </p>
                  <span className="text-lg font-black text-amber-300 tabular-nums shrink-0">
                    {formatPercent(topMovieShare)}
                  </span>
                </div>
              )}
              {topCinema && (
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-zinc-300 truncate" title={topCinema.groupName}>
                    <span className="text-zinc-400">Rạp: </span>
                    <strong className="text-white">{topCinema.groupName}</strong>
                  </p>
                  <span className="text-lg font-black text-blue-300 tabular-nums shrink-0">
                    {formatPercent(topCinemaShare)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Chưa có nhóm phim hoặc rạp phát sinh doanh thu.</p>
          )}
        </div>
      </div>
    </section>
  );
};
