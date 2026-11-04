import axios, { AxiosError } from 'axios';

export class ApiErrorResponse extends Error {
  code: string;
  details?: Record<string, string>;

  constructor(message: string, code: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.code = code;
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
  (error: AxiosError<{ message?: string; code?: string; details?: Record<string, string> }>) => {
    if (error.response?.data) {
      const { message, code, details } = error.response.data;
      return Promise.reject(
        new ApiErrorResponse(
          message || 'Đã có lỗi xảy ra từ máy chủ.',
          code || 'API_ERROR',
          details
        )
      );
    }
    return Promise.reject(
      new ApiErrorResponse(
        error.message || 'Lỗi kết nối máy chủ.',
        'NETWORK_ERROR'
      )
    );
  }
);
