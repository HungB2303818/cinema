export type SchedulePlanStatus = 'ACTIVE' | 'INACTIVE';
export type GenerationOutcome = 'SUCCESS' | 'PARTIAL' | 'SKIPPED' | 'FAILED';

export interface SchedulePlanMovieItem {
  movieId: number;
  title: string;
  durationMinutes: number;
  status: string;
  releaseDate: string | null;
  priority: number;
}

export interface SchedulePlanSummary {
  id: number;
  name: string;
  roomId: number;
  roomName: string;
  cinemaId: number;
  cinemaName: string;
  effectiveFrom: string;
  effectiveTo: string;
  daysOfWeek: number[];
  openTime: string;
  closeTime: string;
  slotStepMinutes: number;
  cleanupMinutes: number;
  basePrice: number;
  vipSurcharge: number;
  status: SchedulePlanStatus;
  movieCount: number;
}

export interface SchedulePlan extends SchedulePlanSummary {
  movies: SchedulePlanMovieItem[];
}

export interface SchedulePlanRequest {
  name: string;
  roomId: number;
  effectiveFrom: string;
  effectiveTo: string;
  daysOfWeek: number[];
  openTime: string;
  closeTime: string;
  slotStepMinutes: number;
  cleanupMinutes: number;
  basePrice: number;
  vipSurcharge: number;
  movieIds: number[];
  status: SchedulePlanStatus;
}

export interface SchedulePlanFilters {
  cinemaId?: number;
  roomId?: number;
  status?: SchedulePlanStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export interface GenerateScheduleRequest {
  from: string;
  to: string;
}

export interface GenerationDateResult {
  date: string;
  outcome: GenerationOutcome;
  createdCount: number;
  skippedCount: number;
  message: string | null;
}

export interface GenerationSummary {
  planId: number;
  from: string;
  to: string;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  dates: GenerationDateResult[];
}

export interface GenerationLog {
  id: number;
  planId: number;
  targetDate: string;
  outcome: GenerationOutcome;
  createdCount: number;
  skippedCount: number;
  message: string | null;
  createdAt: string;
}

export interface GenerationLogFilters {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
