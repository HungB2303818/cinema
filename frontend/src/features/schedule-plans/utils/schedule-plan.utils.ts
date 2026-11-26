import { getVietnamDateString } from '@/shared/utils/format';

export interface WeekdayOption {
  value: number;
  short: string;
  label: string;
}

export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 1, short: 'T2', label: 'Thứ 2' },
  { value: 2, short: 'T3', label: 'Thứ 3' },
  { value: 3, short: 'T4', label: 'Thứ 4' },
  { value: 4, short: 'T5', label: 'Thứ 5' },
  { value: 5, short: 'T6', label: 'Thứ 6' },
  { value: 6, short: 'T7', label: 'Thứ 7' },
  { value: 7, short: 'CN', label: 'Chủ nhật' },
];

export function formatWeekdays(days: number[]): string {
  const selected = new Set(days);
  return (
    WEEKDAY_OPTIONS.filter((option) => selected.has(option.value))
      .map((option) => option.short)
      .join(', ') || 'Chưa chọn'
  );
}

export function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function daysBetweenInclusive(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.floor((end - start) / 86_400_000) + 1;
}

export interface GenerationRange {
  from: string;
  to: string;
  error: string | null;
}

/**
 * Manual generation defaults: today through today + 6, clamped to the plan's validity.
 * Returns an error when the plan can no longer produce any date.
 */
export function defaultGenerationRange(
  effectiveFrom: string,
  effectiveTo: string
): GenerationRange {
  const today = getVietnamDateString();
  if (effectiveTo < today) {
    return {
      from: today,
      to: today,
      error: 'Kế hoạch đã hết hiệu lực nên không thể sinh lịch.',
    };
  }
  const start = today > effectiveFrom ? today : effectiveFrom;
  const horizonEnd = addDaysToDate(start, 6);
  const to = horizonEnd < effectiveTo ? horizonEnd : effectiveTo;
  return { from: start, to, error: null };
}
