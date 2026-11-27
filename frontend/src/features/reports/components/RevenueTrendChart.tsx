import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { RevenueSeriesPoint, RevenueTimeGroup } from '../types/report.types';
import {
  formatChartPeriod,
  formatCompactMoney,
  formatCount,
  formatMoneyString,
  formatPercent,
  formatPeriod,
  toNumericMoney,
} from '../utils/report-format';

export interface RevenueTrendChartProps {
  points: RevenueSeriesPoint[];
  timeGroup: RevenueTimeGroup;
  isLoading: boolean;
  onTimeGroupChange: (group: RevenueTimeGroup) => void;
}

const BAR_STEP = 44;
const BAR_WIDTH = 26;
const PADDING = { top: 28, right: 56, bottom: 48, left: 72 };
const HEIGHT = 290;

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  points,
  timeGroup,
  isLoading,
  onTimeGroupChange,
}) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const showTicketsLine = true;

  const values = React.useMemo(
    () => points.map((point) => Math.max(toNumericMoney(point.totalRevenue), 0)),
    [points]
  );
  const ticketValues = React.useMemo(
    () => points.map((point) => Math.max(point.ticketsSold, 0)),
    [points]
  );

  const maxValue = values.reduce((max, value) => Math.max(max, value), 0);
  const maxTickets = ticketValues.reduce((max, value) => Math.max(max, value), 0);
  const totalRevenue = values.reduce((sum, v) => sum + v, 0);
  const avgValue = points.length > 0 ? totalRevenue / points.length : 0;
  const hasRevenue = maxValue > 0;

  const width = Math.max(points.length * BAR_STEP + PADDING.left + PADDING.right, 680);
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const labelStep = Math.max(1, Math.ceil(points.length / 12));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const avgY = hasRevenue ? PADDING.top + innerHeight - (avgValue / maxValue) * innerHeight : null;

  const ticketsPath = React.useMemo(() => {
    if (!showTicketsLine || maxTickets <= 0 || points.length === 0) return '';
    return points
      .map((_, index) => {
        const cx = PADDING.left + index * BAR_STEP + BAR_STEP / 2;
        const cy = PADDING.top + innerHeight - (ticketValues[index] / maxTickets) * innerHeight;
        return `${index === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      })
      .join(' ');
  }, [showTicketsLine, maxTickets, points, ticketValues, innerHeight]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const activeValue = hoveredIndex !== null ? values[hoveredIndex] : 0;
  const activeVsAvg = avgValue > 0 ? (activeValue - avgValue) / avgValue : 0;

  return (
    <section
      id="xu-huong"
      aria-labelledby="revenueTrendHeading"
      className="bg-[#13151d] border border-[#242733] rounded-2xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h2 id="revenueTrendHeading" className="text-sm font-bold text-white">
            Xu hướng doanh thu &amp; sản lượng vé
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  timeGroup === group
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {group === 'DAY' ? 'Theo ngày' : 'Theo tháng'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Legend & Interactive Hover Inspection Strip */}
      {points.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0c0d12] border border-[#242733] px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-zinc-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>Đạt/vượt trung bình</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span>Dưới trung bình</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Không phát sinh (0 ₫)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-amber-400" />
              <span className="text-amber-300 tabular-nums">
                Trung bình ({formatCompactMoney(avgValue)})
              </span>
            </span>
            {showTicketsLine && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-violet-400" />
                <span className="text-violet-300">Số vé bán</span>
              </span>
            )}
          </div>

          {activePoint ? (
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <span className="font-bold text-white">
                {formatPeriod(activePoint.period, timeGroup)}
              </span>
              <span className="text-emerald-300 font-bold">
                {formatMoneyString(activePoint.totalRevenue)}
              </span>
              <span className="text-blue-300">{formatCount(activePoint.successfulPayments)} GD</span>
              <span className="text-violet-300">{formatCount(activePoint.ticketsSold)} vé</span>
              {hasRevenue && (
                <span
                  className={`font-semibold ${
                    activeVsAvg >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  ({activeVsAvg >= 0 ? '+' : ''}
                  {formatPercent(activeVsAvg, 0)} vs TB)
                </span>
              )}
            </div>
          ) : (
            <span className="text-zinc-500">Di chuột vào cột để xem chi tiết</span>
          )}
        </div>
      )}

      {isLoading && points.length === 0 ? (
        <div className="h-[290px] rounded-xl bg-[#0c0d12] animate-pulse" aria-hidden="true" />
      ) : points.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-zinc-400">
          Chưa có dữ liệu thời gian cho khoảng đã chọn.
        </div>
      ) : (
        <>
          {!hasRevenue && (
            <p className="text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2">
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
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <title>Biểu đồ doanh thu theo {timeGroup === 'DAY' ? 'ngày' : 'tháng'}</title>

              {/* Left Y-axis label */}
              <text x={PADDING.left - 8} y={14} textAnchor="end" fontSize={10} fill="#9ca3af">
                VND
              </text>

              {/* Right Y-axis label (Tickets) */}
              {showTicketsLine && maxTickets > 0 && (
                <text
                  x={width - PADDING.right + 8}
                  y={14}
                  textAnchor="start"
                  fontSize={10}
                  fill="#a78bfa"
                >
                  Vé
                </text>
              )}

              {/* Horizontal Gridlines & Y Ticks */}
              {ticks.map((tick) => {
                const y = PADDING.top + innerHeight - tick * innerHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={PADDING.left}
                      x2={width - PADDING.right}
                      y1={y}
                      y2={y}
                      stroke={tick === 0 ? '#353949' : '#242733'}
                      strokeDasharray={tick === 0 ? undefined : '4 4'}
                    />
                    <text
                      x={PADDING.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={11}
                      fill="#9ca3af"
                    >
                      {formatCompactMoney(maxValue * tick)}
                    </text>
                    {showTicketsLine && maxTickets > 0 && (
                      <text
                        x={width - PADDING.right + 10}
                        y={y + 4}
                        textAnchor="start"
                        fontSize={10}
                        fill="#a78bfa"
                      >
                        {Math.round(maxTickets * tick)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Bars */}
              {points.map((point, index) => {
                const value = values[index];
                const barHeight = hasRevenue ? (value / maxValue) * innerHeight : 0;
                const x = PADDING.left + index * BAR_STEP + (BAR_STEP - BAR_WIDTH) / 2;
                const y = PADDING.top + innerHeight - barHeight;
                const showLabel = index % labelStep === 0;
                const isHovered = hoveredIndex === index;
                const isAboveAvg = hasRevenue && value >= avgValue && value > 0;
                const isZero = value <= 0;

                const fill = isAboveAvg
                  ? isHovered
                    ? '#34d399'
                    : '#10b981'
                  : isHovered
                  ? '#60a5fa'
                  : '#3b82f6';

                return (
                  <g
                    key={point.period}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    tabIndex={0}
                    className="cursor-pointer focus:outline-none"
                  >
                    {/* Hover column highlight */}
                    {isHovered && (
                      <rect
                        x={PADDING.left + index * BAR_STEP}
                        y={PADDING.top}
                        width={BAR_STEP}
                        height={innerHeight}
                        fill="#ffffff"
                        fillOpacity={0.04}
                        rx={6}
                      />
                    )}

                    {/* Invisible hit target for easy hover */}
                    <rect
                      x={PADDING.left + index * BAR_STEP}
                      y={PADDING.top}
                      width={BAR_STEP}
                      height={innerHeight}
                      fill="transparent"
                    >
                      <title>
                        {`${formatPeriod(point.period, timeGroup)}: ${formatMoneyString(
                          point.totalRevenue
                        )} — ${point.successfulPayments} giao dịch, ${point.ticketsSold} vé`}
                      </title>
                    </rect>

                    {barHeight > 0 ? (
                      <rect
                        x={x}
                        y={y}
                        width={BAR_WIDTH}
                        height={barHeight}
                        rx={5}
                        fill={fill}
                        className="transition-colors"
                      />
                    ) : isZero ? (
                      <circle
                        cx={x + BAR_WIDTH / 2}
                        cy={PADDING.top + innerHeight - 3}
                        r={isHovered ? 5 : 3.5}
                        fill="#ef4444"
                      />
                    ) : null}

                    {showLabel && (
                      <text
                        x={x + BAR_WIDTH / 2}
                        y={HEIGHT - 20}
                        textAnchor="middle"
                        fontSize={11}
                        fill={isHovered ? '#ffffff' : '#a1a1aa'}
                        fontWeight={isHovered ? 700 : 400}
                      >
                        {formatChartPeriod(point.period, timeGroup)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Average Reference Line - Amber */}
              {avgY !== null && avgValue > 0 && (
                <g pointerEvents="none">
                  <line
                    x1={PADDING.left}
                    x2={width - PADDING.right}
                    y1={avgY}
                    y2={avgY}
                    stroke="#f59e0b"
                    strokeWidth={1.75}
                    strokeDasharray="6 4"
                  />
                </g>
              )}

              {/* Tickets Sold Overlay Line - Violet */}
              {showTicketsLine && ticketsPath && (
                <g pointerEvents="none">
                  <path
                    d={ticketsPath}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((point, index) => {
                    const cx = PADDING.left + index * BAR_STEP + BAR_STEP / 2;
                    const cy =
                      PADDING.top + innerHeight - (ticketValues[index] / maxTickets) * innerHeight;
                    const isHovered = hoveredIndex === index;
                    return (
                      <circle
                        key={`t-${point.period}`}
                        cx={cx}
                        cy={cy}
                        r={isHovered ? 4.5 : 3}
                        fill={isHovered ? '#c4b5fd' : '#a855f7'}
                        stroke="#13151d"
                        strokeWidth={1.5}
                      />
                    );
                  })}
                </g>
              )}
            </svg>
          </div>
        </>
      )}
    </section>
  );
};
