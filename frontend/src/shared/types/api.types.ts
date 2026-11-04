export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
  timestamp?: string;
}
