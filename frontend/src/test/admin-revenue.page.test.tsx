import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { AdminRevenuePage } from '@/pages';
import {
  reportsApi,
  type RevenueBreakdownResponse,
  type RevenueDashboardResponse,
} from '@/features/reports';
import { adminCinemasApi, type Cinema } from '@/features/cinemas';
import { moviesApi, type Movie } from '@/features/movies';
import * as authModule from '@/features/auth';
import { renderWithProviders } from './test-utils';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

describe('Trang doanh thu & thống kê admin', () => {
  const adminUser = {
    id: 1,
    fullName: 'Quản trị viên',
    email: 'admin@cinema.com',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
  };

  const cinemas: Cinema[] = [
    { id: 1, name: 'Rạp trung tâm', address: 'Quận 1', status: 'ACTIVE' },
    { id: 2, name: 'Rạp cũ', address: 'Quận 5', status: 'INACTIVE' },
  ];

  const movies: Movie[] = [
    {
      id: 10,
      title: 'Phim đang chiếu',
      description: null,
      durationMinutes: 120,
      genre: null,
      ageRating: null,
      releaseDate: null,
      posterUrl: null,
      status: 'SHOWING',
    },
    {
      id: 11,
      title: 'Phim ẩn',
      description: null,
      durationMinutes: 90,
      genre: null,
      ageRating: null,
      releaseDate: null,
      posterUrl: null,
      status: 'HIDDEN',
    },
  ];

  const dashboard: RevenueDashboardResponse = {
    filter: { from: '2026-11-01', to: '2026-11-10', cinemaId: null, movieId: null },
    timeGroup: 'DAY',
    summary: {
      totalRevenue: '240000.00',
      successfulPayments: 1,
      ticketsSold: 3,
      averageRevenuePerPayment: '240000.00',
    },
    timeSeries: [
      {
        period: '2026-11-01',
        totalRevenue: '240000.00',
        successfulPayments: 1,
        ticketsSold: 3,
      },
      {
        period: '2026-11-02',
        totalRevenue: '0.00',
        successfulPayments: 0,
        ticketsSold: 0,
      },
    ],
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',
    generatedAt: '2026-11-10T03:00:00Z',
  };

  const breakdown: RevenueBreakdownResponse = {
    filter: { from: '2026-11-01', to: '2026-11-10', cinemaId: null, movieId: null },
    groupBy: 'MOVIE',
    rows: {
      content: [
        {
          groupId: 10,
          groupName: 'Phim đang chiếu',
          totalRevenue: '240000.00',
          successfulPayments: 1,
          ticketsSold: 3,
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    },
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',
    generatedAt: '2026-11-10T03:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      configurable: true,
      value: vi.fn(() => 'blob:mock'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: adminUser,
      token: 'admin-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (role: string) => role === 'ADMIN',
    });

    vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue({
      content: movies,
      page: 0,
      size: 20,
      totalElements: movies.length,
      totalPages: 1,
    });
    vi.spyOn(moviesApi, 'list').mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
    vi.spyOn(adminCinemasApi, 'listCinemas').mockResolvedValue({
      content: cinemas,
      page: 0,
      size: 20,
      totalElements: cinemas.length,
      totalPages: 1,
    });

    vi.spyOn(reportsApi, 'dashboard').mockResolvedValue(dashboard);
    vi.spyOn(reportsApi, 'breakdown').mockResolvedValue(breakdown);
    vi.spyOn(reportsApi, 'exportCsv').mockResolvedValue({
      blob: new Blob(['csv']),
      filename: 'revenue-2026-11-01_2026-11-10.csv',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hiển thị số liệu và danh mục ADMIN gồm phim ẩn, rạp tạm dừng', async () => {
    renderWithProviders(
      <>
        <AdminRevenuePage />
        <LocationProbe />
      </>,
      {
        initialEntries: [
          '/admin/reports/revenue?from=2026-11-01&to=2026-11-10&timeGroup=DAY&tab=time&page=0&size=20',
        ],
      }
    );

    await waitFor(() => {
      expect(screen.getAllByText('240.000 ₫').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Giao dịch thành công').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vé đã bán').length).toBeGreaterThan(0);
    expect(screen.getByText('Bình quân/giao dịch')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Phim ẩn (đã ẩn)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Rạp cũ (tạm dừng)' })).toBeInTheDocument();
    });

    expect(moviesApi.getAdminMovies).toHaveBeenCalled();
    expect(moviesApi.list).not.toHaveBeenCalled();
    expect(adminCinemasApi.listCinemas).toHaveBeenCalled();

    expect(reportsApi.dashboard).toHaveBeenCalledWith(
      { from: '2026-11-01', to: '2026-11-10', cinemaId: null, movieId: null },
      'DAY'
    );
  });

  it('áp dụng bộ lọc, đẩy page về 0 và từ chối khoảng ngày đảo ngược', async () => {
    renderWithProviders(
      <>
        <AdminRevenuePage />
        <LocationProbe />
      </>,
      {
        initialEntries: [
          '/admin/reports/revenue?from=2026-11-01&to=2026-11-10&timeGroup=DAY&tab=movie&page=2&size=20',
        ],
      }
    );

    await waitFor(() => {
      expect(reportsApi.dashboard).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('Rạp'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Phim'), { target: { value: '11' } });

    expect(screen.getByText('Bộ lọc chưa được áp dụng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xuất CSV' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? '';
      expect(search).toContain('from=2026-11-05');
      expect(search).toContain('cinemaId=2');
      expect(search).toContain('movieId=11');
      expect(search).toContain('page=0');
    });

    expect(reportsApi.dashboard).toHaveBeenLastCalledWith(
      { from: '2026-11-05', to: '2026-11-10', cinemaId: 2, movieId: 11 },
      'DAY'
    );

    const callsAfterApply = vi.mocked(reportsApi.dashboard).mock.calls.length;

    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-11-04' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));

    expect(
      screen.getByText('Từ ngày phải trước hoặc bằng đến ngày.')
    ).toBeInTheDocument();
    expect(vi.mocked(reportsApi.dashboard).mock.calls.length).toBe(callsAfterApply);
  });

  it('chuyển tab tải breakdown theo phim và xuất CSV theo bộ lọc đã áp dụng', async () => {
    renderWithProviders(
      <>
        <AdminRevenuePage />
        <LocationProbe />
      </>,
      {
        initialEntries: [
          '/admin/reports/revenue?from=2026-11-01&to=2026-11-10&timeGroup=DAY&tab=time&page=0&size=10',
        ],
      }
    );

    await waitFor(() => {
      expect(reportsApi.dashboard).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Theo phim' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain('tab=movie');
    });

    expect(reportsApi.breakdown).toHaveBeenCalledWith(
      { from: '2026-11-01', to: '2026-11-10', cinemaId: null, movieId: null },
      'MOVIE',
      0,
      10,
      'totalRevenue,desc'
    );

    await waitFor(() => {
      expect(screen.getAllByText('Phim đang chiếu').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }));

    await waitFor(() => {
      expect(reportsApi.exportCsv).toHaveBeenCalledWith(
        { from: '2026-11-01', to: '2026-11-10', cinemaId: null, movieId: null },
        'MOVIE'
      );
    });
  });

  it('hiển thị lỗi tải báo cáo và cho phép thử lại', async () => {
    vi.mocked(reportsApi.dashboard)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(dashboard);

    renderWithProviders(<AdminRevenuePage />, {
      initialEntries: [
        '/admin/reports/revenue?from=2026-11-01&to=2026-11-10&timeGroup=DAY&tab=time&page=0&size=20',
      ],
    });

    await waitFor(() => {
      expect(
        screen.getByText('Không thể tải báo cáo. Vui lòng kiểm tra kết nối và thử lại.')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => {
      expect(screen.getAllByText('240.000 ₫').length).toBeGreaterThan(0);
    });
    expect(reportsApi.dashboard).toHaveBeenCalledTimes(2);
  });

  it('hiển thị nhận định nổi bật, cơ cấu phim/rạp và giới hạn tối đa 10 dòng bảng chi tiết', async () => {
    const twelveDaysDashboard: RevenueDashboardResponse = {
      ...dashboard,
      filter: { from: '2026-11-01', to: '2026-11-12', cinemaId: null, movieId: null },
      timeSeries: Array.from({ length: 12 }, (_, idx) => {
        const day = String(idx + 1).padStart(2, '0');
        return {
          period: `2026-11-${day}`,
          totalRevenue: idx === 0 ? '240000.00' : '0.00',
          successfulPayments: idx === 0 ? 1 : 0,
          ticketsSold: idx === 0 ? 3 : 0,
        };
      }),
    };
    vi.mocked(reportsApi.dashboard).mockResolvedValueOnce(twelveDaysDashboard);

    renderWithProviders(<AdminRevenuePage />, {
      initialEntries: [
        '/admin/reports/revenue?from=2026-11-01&to=2026-11-12&timeGroup=DAY&tab=time&page=0&size=10',
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nhận định nổi bật' })).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Cơ cấu doanh thu theo phim & rạp' })
      ).toBeInTheDocument();
      expect(screen.getByText('Giá vé trung bình')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'So sánh kỳ trước' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đường vé bán' })).not.toBeInTheDocument();
    expect(screen.getByText('Hiển thị 10 / 12 mốc')).toBeInTheDocument();
  });
});
