import React from 'react';
import { Activity, ReceiptText, Tag, Ticket, TrendingUp, Users, Wallet } from 'lucide-react';
import type { RevenueSeriesPoint, RevenueSummary } from '../types/report.types';
import {
  formatCount,
  formatMoneyString,
  formatPercent,
  isZeroMoney,
  toNumericMoney,
} from '../utils/report-format';

export interface RevenueSummaryCardsProps {
  summary: RevenueSummary | null;
  timeSeries?: RevenueSeriesPoint[];
  isLoading: boolean;
}

interface CardTone {
  iconBg: string;
  iconText: string;
  borderHover: string;
}

interface CardConfig {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: CardTone;
}

const TONES: Record<'green' | 'blue' | 'amber' | 'violet', CardTone> = {
  green: {
    iconBg: 'bg-emerald-500/15 border border-emerald-500/30',
    iconText: 'text-emerald-400',
    borderHover: 'hover:border-emerald-500/40',
  },
  blue: {
    iconBg: 'bg-blue-500/15 border border-blue-500/30',
    iconText: 'text-blue-400',
    borderHover: 'hover:border-blue-500/40',
  },
  amber: {
    iconBg: 'bg-amber-500/15 border border-amber-500/30',
    iconText: 'text-amber-400',
    borderHover: 'hover:border-amber-500/40',
  },
  violet: {
    iconBg: 'bg-violet-500/15 border border-violet-500/30',
    iconText: 'text-violet-400',
    borderHover: 'hover:border-violet-500/40',
  },
};

export const RevenueSummaryCards: React.FC<RevenueSummaryCardsProps> = ({
  summary,
  timeSeries = [],
  isLoading,
}) => {
  if (isLoading && !summary) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="bg-[#13151d] border border-[#242733] rounded-2xl p-5 space-y-3 animate-pulse"
            >
              <div className="h-3 w-24 rounded bg-[#242733]" />
              <div className="h-7 w-36 rounded bg-[#242733]" />
              <div className="h-3 w-28 rounded bg-[#1c1f29]" />
            </div>
          ))}
        </div>
        <div className="h-16 rounded-2xl bg-[#13151d] border border-[#242733] animate-pulse" />
      </div>
    );
  }

  if (!summary) return null;

  const totalRevenueNum = toNumericMoney(summary.totalRevenue);

  const avgTicketPrice =
    summary.ticketsSold > 0 ? (totalRevenueNum / summary.ticketsSold).toFixed(0) : '0';
  const ticketsPerPayment =
    summary.successfulPayments > 0 ? summary.ticketsSold / summary.successfulPayments : 0;

  const totalPeriods = timeSeries.length;
  const activePeriods = timeSeries.filter((p) => !isZeroMoney(p.totalRevenue)).length;
  const activeRatio = totalPeriods > 0 ? activePeriods / totalPeriods : 0;

  const activeBarColor =
    activeRatio >= 0.7 ? 'bg-emerald-500' : activeRatio >= 0.35 ? 'bg-amber-500' : 'bg-red-500';
  const activeTextColor =
    activeRatio >= 0.7 ? 'text-emerald-300' : activeRatio >= 0.35 ? 'text-amber-300' : 'text-red-300';

  const cards: CardConfig[] = [
    {
      key: 'revenue',
      label: 'Doanh thu',
      value: formatMoneyString(summary.totalRevenue),
      hint: 'Tổng thu từ giao dịch thành công',
      icon: Wallet,
      tone: TONES.green,
    },
    {
      key: 'payments',
      label: 'Giao dịch thành công',
      value: formatCount(summary.successfulPayments),
      hint: 'Số lượt thanh toán trạng thái SUCCESS',
      icon: ReceiptText,
      tone: TONES.blue,
    },
    {
      key: 'tickets',
      label: 'Vé đã bán',
      value: formatCount(summary.ticketsSold),
      hint: 'Tổng số ghế đã phát hành vé',
      icon: Ticket,
      tone: TONES.amber,
    },
    {
      key: 'average',
      label: 'Bình quân/giao dịch',
      value: formatMoneyString(summary.averageRevenuePerPayment),
      hint: 'Giá trị trung bình mỗi đơn thanh toán',
      icon: TrendingUp,
      tone: TONES.violet,
    },
  ];

  return (
    <section id="tong-quan" aria-label="Chỉ số tổng quan doanh thu" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`bg-[#13151d] border border-[#242733] ${card.tone.borderHover} rounded-2xl p-5 space-y-2 shadow-lg shadow-black/15 transition-colors`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-300">{card.label}</p>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.tone.iconBg} ${card.tone.iconText}`}
                >
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white break-words tabular-nums">
                {card.value}
              </p>
              <p className="text-xs text-zinc-400">{card.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Derived Statistical Efficiency Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#13151d] border border-[#242733] rounded-2xl p-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Tag className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400">Giá vé trung bình</p>
            <p className="text-sm sm:text-base font-bold text-white tabular-nums">
              {formatMoneyString(avgTicketPrice)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:border-l md:border-[#242733] md:pl-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-zinc-400">Số vé trung bình / giao dịch</p>
            <p className="text-sm sm:text-base font-bold text-white tabular-nums">
              {ticketsPerPayment.toFixed(2).replace('.', ',')} vé
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:border-l md:border-[#242733] md:pl-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Activity className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-400">Mốc có doanh thu</p>
              <span className={`text-xs font-bold tabular-nums ${activeTextColor}`}>
                {totalPeriods > 0
                  ? `${formatCount(activePeriods)}/${formatCount(totalPeriods)} (${formatPercent(activeRatio, 0)})`
                  : '—'}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#242733] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${activeBarColor}`}
                style={{ width: `${Math.round(activeRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
