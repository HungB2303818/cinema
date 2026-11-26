import type { PageResponse } from '@/shared/types/api.types';

export type RevenueTimeGroup = 'DAY' | 'MONTH';
export type RevenueGroupBy = 'MOVIE' | 'CINEMA';
export type RevenueExportGroupBy = 'DAY' | 'MONTH' | 'MOVIE' | 'CINEMA';
export type RevenueTab = 'time' | 'movie' | 'cinema';

export interface RevenueFilters {
  from: string;
  to: string;
  cinemaId: number | null;
  movieId: number | null;
}

export interface RevenueReportFilter {
  from: string;
  to: string;
  cinemaId: number | null;
  movieId: number | null;
}

export interface RevenueSummary {
  totalRevenue: string;
  successfulPayments: number;
  ticketsSold: number;
  averageRevenuePerPayment: string;
}

export interface RevenueSeriesPoint {
  period: string;
  totalRevenue: string;
  successfulPayments: number;
  ticketsSold: number;
}

export interface RevenueBreakdownRow {
  groupId: number;
  groupName: string;
  totalRevenue: string;
  successfulPayments: number;
  ticketsSold: number;
}

export interface RevenueDashboardResponse {
  filter: RevenueReportFilter;
  timeGroup: RevenueTimeGroup;
  summary: RevenueSummary;
  timeSeries: RevenueSeriesPoint[];
  currency: string;
  timezone: string;
  generatedAt: string;
}

export interface RevenueBreakdownResponse {
  filter: RevenueReportFilter;
  groupBy: RevenueGroupBy;
  rows: PageResponse<RevenueBreakdownRow>;
  currency: string;
  timezone: string;
  generatedAt: string;
}

export interface RevenueExportFile {
  blob: Blob;
  filename: string;
}
