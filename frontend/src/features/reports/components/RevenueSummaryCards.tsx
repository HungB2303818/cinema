import React from 'react';
import { ReceiptText, Ticket, TrendingUp, Wallet } from 'lucide-react';
import type { RevenueSummary } from '../types/report.types';
import { formatCount, formatMoneyString } from '../utils/report-format';

export interface RevenueSummaryCardsProps {
  summary: RevenueSummary | null;
  isLoading: boolean;
}

interface CardConfig {
  key: string;
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const RevenueSummaryCards: React.FC<RevenueSummaryCardsProps> = ({
  summary,
  isLoading,
}) => {
  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-hidden="true">
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
    );
  }

  if (!summary) return null;

  const cards: CardConfig[] = [
    {
      key: 'revenue',
      label: 'Doanh thu',
      value: formatMoneyString(summary.totalRevenue),
      hint: 'Chỉ giao dịch thành công',
      icon: Wallet,
    },
    {
      key: 'payments',
      label: 'Giao dịch thành công',
      value: formatCount(summary.successfulPayments),
      hint: 'Số lần thanh toán SUCCESS',
      icon: ReceiptText,
    },
    {
      key: 'tickets',
      label: 'Vé đã bán',
      value: formatCount(summary.ticketsSold),
      hint: 'Số ghế đã phát hành vé',
      icon: Ticket,
    },
    {
      key: 'average',
      label: 'Bình quân/giao dịch',
      value: formatMoneyString(summary.averageRevenuePerPayment),
      hint: 'Doanh thu chia số giao dịch',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="bg-[#13151d] border border-[#242733] rounded-2xl p-5 space-y-2 shadow-lg shadow-black/10"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {card.label}
              </p>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6e2c1]/10 text-[#e6e2c1]">
                <Icon className="w-4 h-4" />
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white break-words">{card.value}</p>
            <p className="text-[11px] text-zinc-500">{card.hint}</p>
          </div>
        );
      })}
    </div>
  );
};
