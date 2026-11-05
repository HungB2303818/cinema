import axios, { AxiosError } from 'axios';
import type { FieldErrorItem } from '../types/api.types';

export class ApiErrorResponse extends Error {
  code: string;
  status?: number;
  fieldErrors?: FieldErrorItem[];
  timestamp?: string;
  path?: string;
  details?: Record<string, string>;

  constructor(
    message: string,
    code: string,
    status?: number,
    fieldErrors?: FieldErrorItem[],
    timestamp?: string,
    path?: string,
    details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.timestamp = timestamp;
    this.path = path;
    this.details = details;
  }
}

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token if available
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Standardize error format
httpClient.interceptors.response.use(
  (response) => response,
  (
    error: AxiosError<{
      message?: string;
      code?: string;
      timestamp?: string;
      path?: string;
      fieldErrors?: FieldErrorItem[];
      details?: Record<string, string>;
    }>
  ) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const code =
        data?.code ||
        (status === 404
          ? 'RESOURCE_NOT_FOUND'
          : status === 400
          ? 'VALIDATION_ERROR'
          : status === 401
          ? 'UNAUTHORIZED'
          : status === 403
          ? 'FORBIDDEN'
          : status === 409
          ? 'CONFLICT'
          : 'API_ERROR');
      const message =
        data?.message ||
        (status === 404
          ? 'Không tìm thấy tài nguyên yêu cầu.'
          : 'Đã có lỗi xảy ra từ máy chủ.');

      return Promise.reject(
        new ApiErrorResponse(
          message,
          code,
          status,
          data?.fieldErrors,
          data?.timestamp,
          data?.path,
          data?.details
        )
      );
    }

    return Promise.reject(
      new ApiErrorResponse(
        error.message || 'Lỗi kết nối máy chủ.',
        'NETWORK_ERROR',
        undefined
      )
    );
  }
);
