import { getVietnamDateString } from '@/shared/utils/format';
import type {
  RevenueExportGroupBy,
  RevenueFilters,
  RevenueGroupBy,
  RevenueTab,
  RevenueTimeGroup,
} from '../types/report.types';

export const MAX_RANGE_DAYS = 366;
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export const GROUP_SORT = 'totalRevenue,desc';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const POSITIVE_INTEGER = /^\d+$/;

export interface RevenueFilterInput {
  from: string;
  to: string;
  cinemaId: string;
  movieId: string;
}

export interface RevenueFilterErrors {
  from?: string;
  to?: string;
  range?: string;
  cinemaId?: string;
  movieId?: string;
}

export interface RevenueQueryState {
  filters: RevenueFilters;
  timeGroup: RevenueTimeGroup;
  tab: RevenueTab;
  page: number;
  size: number;
}

export interface ParsedRevenueQuery {
  input: RevenueFilterInput;
  timeGroup: RevenueTimeGroup;
  tab: RevenueTab;
  page: number;
  size: number;
  query: RevenueQueryState | null;
  errors: RevenueFilterErrors;
}

export type QuickRange = 'today' | 'last7' | 'thisMonth' | 'lastMonth';

export function defaultRange(today: string = getVietnamDateString()): { from: string; to: string } {
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function quickRange(kind: QuickRange, today: string = getVietnamDateString()): { from: string; to: string } {
  const [year, month] = today.split('-').map(Number);
  switch (kind) {
    case 'today':
      return { from: today, to: today };
    case 'last7':
      return { from: addDays(today, -6), to: today };
    case 'thisMonth':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'lastMonth': {
      const previousMonth = new Date(Date.UTC(year, month - 2, 1));
      const from = previousMonth.toISOString().slice(0, 10);
      const to = new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10);
      return { from, to };
    }
  }
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000 || year > 9998) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function daysInclusive(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function parsePositiveId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!POSITIVE_INTEGER.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validateRevenueFilterInput(input: RevenueFilterInput): {
  filters: RevenueFilters | null;
  errors: RevenueFilterErrors;
} {
  const errors: RevenueFilterErrors = {};
  const from = input.from.trim();
  const to = input.to.trim();

  if (!from) errors.from = 'Vui lòng chọn từ ngày.';
  else if (!isValidIsoDate(from)) errors.from = 'Ngày không hợp lệ (YYYY-MM-DD).';

  if (!to) errors.to = 'Vui lòng chọn đến ngày.';
  else if (!isValidIsoDate(to)) errors.to = 'Ngày không hợp lệ (YYYY-MM-DD).';

  if (!errors.from && !errors.to) {
    if (from > to) {
      errors.range = 'Từ ngày phải trước hoặc bằng đến ngày.';
    } else if (daysInclusive(from, to) > MAX_RANGE_DAYS) {
      errors.range = `Khoảng ngày tối đa ${MAX_RANGE_DAYS} ngày, tính cả hai đầu.`;
    }
  }

  const cinemaId = parsePositiveId(input.cinemaId);
  if (input.cinemaId.trim() && cinemaId === null) {
    errors.cinemaId = 'Mã rạp phải là số nguyên dương.';
  }

  const movieId = parsePositiveId(input.movieId);
  if (input.movieId.trim() && movieId === null) {
    errors.movieId = 'Mã phim phải là số nguyên dương.';
  }

  if (Object.keys(errors).length > 0) return { filters: null, errors };

  return {
    filters: { from, to, cinemaId, movieId },
    errors,
  };
}

function parseTab(value: string | null): RevenueTab {
  return value === 'movie' || value === 'cinema' ? value : 'time';
}

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parseSize(value: string | null): number {
  const parsed = Number(value);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

export function parseRevenueQuery(
  searchParams: URLSearchParams,
  today: string = getVietnamDateString()
): ParsedRevenueQuery {
  const fallback = defaultRange(today);
  const input: RevenueFilterInput = {
    from: searchParams.get('from')?.trim() || fallback.from,
    to: searchParams.get('to')?.trim() || fallback.to,
    cinemaId: searchParams.get('cinemaId')?.trim() || '',
    movieId: searchParams.get('movieId')?.trim() || '',
  };
  const timeGroup: RevenueTimeGroup = searchParams.get('timeGroup') === 'MONTH' ? 'MONTH' : 'DAY';
  const tab = parseTab(searchParams.get('tab'));
  const page = parsePage(searchParams.get('page'));
  const size = parseSize(searchParams.get('size'));
  const { filters, errors } = validateRevenueFilterInput(input);

  return {
    input,
    timeGroup,
    tab,
    page,
    size,
    query: filters ? { filters, timeGroup, tab, page, size } : null,
    errors,
  };
}

export function buildRevenueSearchParams(query: RevenueQueryState): URLSearchParams {
  const params = new URLSearchParams();
  params.set('from', query.filters.from);
  params.set('to', query.filters.to);
  if (query.filters.cinemaId !== null) params.set('cinemaId', String(query.filters.cinemaId));
  if (query.filters.movieId !== null) params.set('movieId', String(query.filters.movieId));
  params.set('timeGroup', query.timeGroup);
  params.set('tab', query.tab);
  params.set('page', String(query.page));
  params.set('size', String(query.size));
  return params;
}

export function sameFilterInput(a: RevenueFilterInput, b: RevenueFilterInput): boolean {
  return (
    a.from.trim() === b.from.trim() &&
    a.to.trim() === b.to.trim() &&
    a.cinemaId.trim() === b.cinemaId.trim() &&
    a.movieId.trim() === b.movieId.trim()
  );
}

export function revenueTabToGroupBy(tab: RevenueTab): RevenueGroupBy | null {
  if (tab === 'movie') return 'MOVIE';
  if (tab === 'cinema') return 'CINEMA';
  return null;
}

export function revenueTabToExportGroupBy(
  tab: RevenueTab,
  timeGroup: RevenueTimeGroup
): RevenueExportGroupBy {
  if (tab === 'movie') return 'MOVIE';
  if (tab === 'cinema') return 'CINEMA';
  return timeGroup;
}
