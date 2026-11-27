import { formatDate, formatDateTime } from '@/shared/utils/format';
import type { RevenueTimeGroup } from '../types/report.types';

const DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Formats a decimal string without converting it to Number, so large amounts
 * keep every digit. Backend money fields are decimal strings by contract.
 */
export function formatMoneyString(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0 ₫';
  const normalized = value.trim();
  if (!DECIMAL.test(normalized)) return normalized;

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, fractionPart = ''] = unsigned.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = fractionPart.replace(/0+$/, '');
  return `${negative ? '-' : ''}${grouped}${fraction ? `,${fraction}` : ''} ₫`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export function formatPeriod(period: string, timeGroup: RevenueTimeGroup): string {
  if (timeGroup === 'MONTH') {
    const match = /^(\d{4})-(\d{2})$/.exec(period);
    return match ? `Tháng ${Number(match[2])}/${match[1]}` : period;
  }
  return formatDate(period);
}

export function formatReportGeneratedAt(isoString: string): string {
  return formatDateTime(isoString);
}

export function formatCompactMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} ng`;
  return String(Math.round(value));
}

export function formatChartPeriod(period: string, timeGroup: RevenueTimeGroup): string {
  if (timeGroup === 'MONTH') {
    const match = /^(\d{4})-(\d{2})$/.exec(period);
    return match ? `T${Number(match[2])}/${match[1].slice(2)}` : period;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
  return match ? `${match[3]}/${match[2]}` : period;
}

export function isZeroMoney(value: string): boolean {
  return /^-?0+(\.0+)?$/.test(value.trim());
}

export function toNumericMoney(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return '0%';
  return `${(ratio * 100).toFixed(digits).replace('.', ',')}%`;
}

export interface PeriodDelta {
  direction: 'up' | 'down' | 'flat';
  percentLabel: string;
  diff: number;
}

export function calculateDelta(current: number, previous: number): PeriodDelta {
  const diff = current - previous;
  if (Math.abs(diff) < 1e-9) {
    return { direction: 'flat', percentLabel: '0%', diff: 0 };
  }
  if (previous <= 0) {
    return {
      direction: diff > 0 ? 'up' : 'down',
      percentLabel: diff > 0 ? 'Mới' : '-100%',
      diff,
    };
  }
  const pct = (diff / previous) * 100;
  const formatted = `${pct > 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%`;
  return {
    direction: diff > 0 ? 'up' : 'down',
    percentLabel: formatted,
    diff,
  };
}
