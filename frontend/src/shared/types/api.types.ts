export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last?: boolean;
}

export interface FieldErrorItem {
  field: string;
  rejectedValue?: unknown;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  timestamp?: string;
  path?: string;
  fieldErrors?: FieldErrorItem[];
  details?: Record<string, string>;
}
