import React from 'react';
import { Film, MapPin, PieChart } from 'lucide-react';
import type { RevenueBreakdownRow } from '../types/report.types';
import {
  formatCount,
  formatMoneyString,
  formatPercent,
  toNumericMoney,
} from '../utils/report-format';

export interface RevenueBreakdownChartsProps {
  totalRevenue: string;
  topMovies: RevenueBreakdownRow[];
  topCinemas: RevenueBreakdownRow[];
  moviesLoading: boolean;
  cinemasLoading: boolean;
  onSelectMovie?: (movieId: number) => void;
  onSelectCinema?: (cinemaId: number) => void;
}

const SEGMENT_COLORS = [
  { hex: '#10b981', bar: 'bg-emerald-500', dot: 'bg-emerald-400', text: 'text-emerald-300' }, // Green
  { hex: '#3b82f6', bar: 'bg-blue-500', dot: 'bg-blue-400', text: 'text-blue-300' }, // Blue
  { hex: '#f59e0b', bar: 'bg-amber-500', dot: 'bg-amber-400', text: 'text-amber-300' }, // Amber
  { hex: '#8b5cf6', bar: 'bg-violet-500', dot: 'bg-violet-400', text: 'text-violet-300' }, // Violet
  { hex: '#ef4444', bar: 'bg-red-500', dot: 'bg-red-400', text: 'text-red-300' }, // Red
];
const OTHER_COLOR = { hex: '#64748b', bar: 'bg-slate-500', dot: 'bg-slate-400', text: 'text-slate-300' };

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const MiniDonut: React.FC<{ slices: DonutSlice[]; total: number; centerLabel: string }> = ({
  slices,
  total,
  centerLabel,
}) => {
  const radius = 44;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const segments = React.useMemo(() => {
    if (total <= 0) return [];
    return slices.reduce<Array<DonutSlice & { dash: number; offset: number; nextAcc: number }>>(
      (acc, slice) => {
        const prevAcc = acc.length > 0 ? acc[acc.length - 1].nextAcc : 0;
        const ratio = slice.value / total;
        acc.push({
          ...slice,
          dash: ratio * circumference,
          offset: -prevAcc * circumference,
          nextAcc: prevAcc + ratio,
        });
        return acc;
      },
      []
    );
  }, [slices, total, circumference]);

  return (
    <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 112 112" className="w-28 h-28 -rotate-90" aria-hidden="true">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#242733"
          strokeWidth={strokeWidth}
        />
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx="56"
            cy="56"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
            strokeDashoffset={segment.offset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="text-[10px] text-zinc-400">Top {slices.filter((s) => s.color !== OTHER_COLOR.hex).length}</span>
        <span className="text-xs font-bold text-white leading-tight">{centerLabel}</span>
      </div>
    </div>
  );
};

interface BreakdownCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  rows: RevenueBreakdownRow[];
  totalRevenueNum: number;
  isLoading: boolean;
  onSelectItem?: (id: number) => void;
  emptyLabel: string;
}

const BreakdownCard: React.FC<BreakdownCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColorClass,
  rows,
  totalRevenueNum,
  isLoading,
  onSelectItem,
  emptyLabel,
}) => {
  const top5 = rows.slice(0, 5);
  const topSum = top5.reduce((sum, r) => sum + toNumericMoney(r.totalRevenue), 0);
  const effectiveTotal = Math.max(totalRevenueNum, topSum);
  const otherValue = Math.max(0, effectiveTotal - topSum);
  const maxRowValue = top5.reduce((max, r) => Math.max(max, toNumericMoney(r.totalRevenue)), 0);

  const slices: DonutSlice[] = top5.map((row, idx) => ({
    label: row.groupName,
    value: toNumericMoney(row.totalRevenue),
    color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length].hex,
  }));
  if (otherValue > 0.01) {
    slices.push({ label: 'Nhóm khác', value: otherValue, color: OTHER_COLOR.hex });
  }

  const topSharePercent = effectiveTotal > 0 ? formatPercent(topSum / effectiveTotal, 0) : '0%';

  return (
    <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColorClass}`} />
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
        </div>
        {onSelectItem && top5.length > 0 && (
          <span className="text-[11px] text-zinc-400">Nhấn vào mục để lọc nhanh</span>
        )}
      </div>

      {isLoading && top5.length === 0 ? (
        <div className="space-y-3 animate-pulse" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-[#1c1f29]" />
          ))}
        </div>
      ) : top5.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-400">{emptyLabel}</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <MiniDonut slices={slices} total={effectiveTotal} centerLabel={topSharePercent} />

          <div className="w-full flex-1 space-y-3">
            {top5.map((row, idx) => {
              const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
              const value = toNumericMoney(row.totalRevenue);
              const share = effectiveTotal > 0 ? value / effectiveTotal : 0;
              const barWidth = maxRowValue > 0 ? (value / maxRowValue) * 100 : 0;

              return (
                <button
                  key={row.groupId}
                  type="button"
                  onClick={() => onSelectItem?.(row.groupId)}
                  disabled={!onSelectItem}
                  className="w-full text-left group rounded-lg p-1.5 -m-1.5 hover:bg-[#1a1d28] transition-colors cursor-pointer disabled:cursor-default"
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                      <span className="font-semibold text-zinc-100 group-hover:text-white truncate">
                        {row.groupName}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold text-white tabular-nums">
                      {formatMoneyString(row.totalRevenue)}{' '}
                      <span className={`font-semibold ${color.text}`}>
                        ({formatPercent(share)})
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#0c0d12] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${color.bar}`}
                      style={{ width: `${Math.max(barWidth, 2)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 tabular-nums">
                    <span>{formatCount(row.ticketsSold)} vé</span>
                    <span>•</span>
                    <span>{formatCount(row.successfulPayments)} giao dịch</span>
                  </div>
                </button>
              );
            })}

            {otherValue > 0.01 && (
              <div className="pt-1 flex items-center justify-between text-xs text-zinc-400 border-t border-[#242733]">
                <span className="inline-flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${OTHER_COLOR.dot}`} />
                  <span>Các mục còn lại</span>
                </span>
                <span className="tabular-nums font-semibold text-zinc-300">
                  {formatMoneyString(otherValue.toFixed(0))} ({formatPercent(otherValue / effectiveTotal)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const RevenueBreakdownCharts: React.FC<RevenueBreakdownChartsProps> = ({
  totalRevenue,
  topMovies,
  topCinemas,
  moviesLoading,
  cinemasLoading,
  onSelectMovie,
  onSelectCinema,
}) => {
  const totalRevenueNum = toNumericMoney(totalRevenue);

  return (
    <section id="co-cau" aria-labelledby="revenueStructureHeading" className="space-y-3">
      <div className="flex items-center gap-2">
        <PieChart className="w-4 h-4 text-blue-400" />
        <h2 id="revenueStructureHeading" className="text-sm font-bold text-white">
          Cơ cấu doanh thu theo phim &amp; rạp
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <BreakdownCard
          title="Top phim đóng góp doanh thu"
          subtitle="Tỷ trọng 5 phim dẫn đầu trên tổng doanh thu kỳ chọn"
          icon={Film}
          iconColorClass="text-emerald-400"
          rows={topMovies}
          totalRevenueNum={totalRevenueNum}
          isLoading={moviesLoading}
          onSelectItem={onSelectMovie}
          emptyLabel="Chưa có dữ liệu doanh thu theo phim."
        />

        <BreakdownCard
          title="Top rạp đóng góp doanh thu"
          subtitle="Tỷ trọng 5 rạp dẫn đầu trên tổng doanh thu kỳ chọn"
          icon={MapPin}
          iconColorClass="text-blue-400"
          rows={topCinemas}
          totalRevenueNum={totalRevenueNum}
          isLoading={cinemasLoading}
          onSelectItem={onSelectCinema}
          emptyLabel="Chưa có dữ liệu doanh thu theo rạp."
        />
      </div>
    </section>
  );
};
