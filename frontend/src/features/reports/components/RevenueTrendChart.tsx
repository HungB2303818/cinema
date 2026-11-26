import React from 'react';
import type { RevenueSeriesPoint, RevenueTimeGroup } from '../types/report.types';
import {
  formatChartPeriod,
  formatCompactMoney,
  formatMoneyString,
  formatPeriod,
} from '../utils/report-format';

export interface RevenueTrendChartProps {
  points: RevenueSeriesPoint[];
  timeGroup: RevenueTimeGroup;
  isLoading: boolean;
  onTimeGroupChange: (group: RevenueTimeGroup) => void;
}

const BAR_STEP = 40;
const BAR_WIDTH = 24;
const PADDING = { top: 20, right: 16, bottom: 44, left: 64 };
const HEIGHT = 260;

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  points,
  timeGroup,
  isLoading,
  onTimeGroupChange,
}) => {
  const values = points.map((point) => {
    const parsed = Number(point.totalRevenue);
    return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
  });
  const maxValue = values.reduce((max, value) => Math.max(max, value), 0);
  const hasRevenue = maxValue > 0;
  const width = Math.max(points.length * BAR_STEP + PADDING.left + PADDING.right, 640);
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const labelStep = Math.max(1, Math.ceil(points.length / 12));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section
      aria-labelledby="revenueTrendHeading"
      className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="revenueTrendHeading" className="text-sm font-bold text-zinc-200">
            Xu hướng doanh thu
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Đơn vị VND. Di chuột hoặc dùng bảng bên dưới để xem chi tiết từng mốc.
          </p>
        </div>

        <div
          role="group"
          aria-label="Kiểu nhóm thời gian"
          className="inline-flex rounded-full bg-[#0c0d12] border border-[#242733] p-1"
        >
          {(['DAY', 'MONTH'] as RevenueTimeGroup[]).map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => onTimeGroupChange(group)}
              aria-pressed={timeGroup === group}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                timeGroup === group
                  ? 'bg-[#e6e2c1] text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {group === 'DAY' ? 'Theo ngày' : 'Theo tháng'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && points.length === 0 ? (
        <div className="h-[260px] rounded-xl bg-[#0c0d12] animate-pulse" aria-hidden="true" />
      ) : points.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-zinc-500">
          Chưa có dữ liệu thời gian cho khoảng đã chọn.
        </div>
      ) : (
        <>
          {!hasRevenue && (
            <p className="text-xs font-semibold text-amber-300">
              Không có giao dịch thành công trong khoảng đã chọn.
            </p>
          )}
          <div className="overflow-x-auto">
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={`Biểu đồ doanh thu theo ${timeGroup === 'DAY' ? 'ngày' : 'tháng'} trong khoảng đã chọn`}
              className="block"
            >
              <title>Biểu đồ doanh thu theo {timeGroup === 'DAY' ? 'ngày' : 'tháng'}</title>

              {ticks.map((tick) => {
                const y = PADDING.top + innerHeight - tick * innerHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={PADDING.left}
                      x2={width - PADDING.right}
                      y1={y}
                      y2={y}
                      stroke="#242733"
                      strokeDasharray={tick === 0 ? undefined : '4 4'}
                    />
                    <text
                      x={PADDING.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={10}
                      fill="#71717a"
                    >
                      {formatCompactMoney(maxValue * tick)}
                    </text>
                  </g>
                );
              })}

              {points.map((point, index) => {
                const value = values[index];
                const barHeight = hasRevenue ? (value / maxValue) * innerHeight : 0;
                const x = PADDING.left + index * BAR_STEP + (BAR_STEP - BAR_WIDTH) / 2;
                const y = PADDING.top + innerHeight - barHeight;
                const showLabel = index % labelStep === 0;
                return (
                  <g key={point.period}>
                    {barHeight > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={BAR_WIDTH}
                        height={barHeight}
                        rx={4}
                        fill="#e6e2c1"
                        className="hover:fill-white transition-colors"
                      >
                        <title>
                          {`${formatPeriod(point.period, timeGroup)}: ${formatMoneyString(
                            point.totalRevenue
                          )} — ${point.successfulPayments} giao dịch, ${point.ticketsSold} vé`}
                        </title>
                      </rect>
                    )}
                    {showLabel && (
                      <text
                        x={x + BAR_WIDTH / 2}
                        y={HEIGHT - 18}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#a1a1aa"
                      >
                        {formatChartPeriod(point.period, timeGroup)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}
    </section>
  );
};
