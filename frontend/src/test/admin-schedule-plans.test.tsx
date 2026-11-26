import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import {
  AdminSchedulePlanFormPage,
  AdminSchedulePlanLogsPage,
  AdminSchedulePlansPage,
} from '@/pages';
import {
  adminSchedulePlansApi,
  type GenerationLog,
  type GenerationSummary,
  type SchedulePlan,
  type SchedulePlanSummary,
} from '@/features/schedule-plans';
import { adminCinemasApi, type Cinema, type RoomResponse } from '@/features/cinemas';
import { moviesApi, type Movie } from '@/features/movies';
import type { PageResponse } from '@/shared/types/api.types';
import * as authModule from '@/features/auth';
import { AdminLayout } from '@/shared/components/layout/AdminLayout';
import { renderWithProviders } from './test-utils';

describe('Admin lịch chiếu tự động', () => {
  const adminUser = {
    id: 1,
    fullName: 'Quản trị viên',
    email: 'admin@cinema.com',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
  };

  const mockCinemas: Cinema[] = [
    {
      id: 1,
      name: 'CGV Vincom Cần Thơ',
      address: 'Số 2 Hùng Vương, Ninh Kiều, Cần Thơ',
      status: 'ACTIVE',
    },
  ];

  const mockRooms: RoomResponse[] = [
    { id: 10, cinemaId: 1, name: 'Cinema 1', status: 'ACTIVE' },
    { id: 11, cinemaId: 1, name: 'Cinema 2', status: 'MAINTENANCE' },
  ];

  const mockMovies: Movie[] = [
    {
      id: 100,
      title: 'Đào, Phở và Piano',
      description: 'Phim lịch sử Việt Nam',
      durationMinutes: 100,
      genre: 'Lịch sử',
      ageRating: 'T13',
      posterUrl: null,
      status: 'SHOWING',
      releaseDate: '2024-02-10',
    },
    {
      id: 101,
      title: 'Mai',
      description: 'Phim tâm lý tình cảm',
      durationMinutes: 120,
      genre: 'Tâm lý',
      ageRating: 'T18',
      posterUrl: null,
      status: 'SHOWING',
      releaseDate: '2024-02-10',
    },
    {
      id: 102,
      title: 'Phim Đang Ẩn',
      description: 'Phim chưa công bố',
      durationMinutes: 90,
      genre: 'Hành động',
      ageRating: 'P',
      posterUrl: null,
      status: 'HIDDEN',
      releaseDate: '2026-12-01',
    },
  ];

  const planSummary: SchedulePlanSummary = {
    id: 7,
    name: 'Lịch tối phòng 1',
    roomId: 10,
    roomName: 'Cinema 1',
    cinemaId: 1,
    cinemaName: 'CGV Vincom Cần Thơ',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2099-12-31',
    daysOfWeek: [1, 2, 3, 4, 5],
    openTime: '08:00',
    closeTime: '23:00',
    slotStepMinutes: 15,
    cleanupMinutes: 15,
    basePrice: 75000,
    vipSurcharge: 20000,
    status: 'ACTIVE',
    movieCount: 2,
  };

  const planDetail: SchedulePlan = {
    ...planSummary,
    movies: [
      {
        movieId: 100,
        title: 'Đào, Phở và Piano',
        durationMinutes: 100,
        status: 'SHOWING',
        releaseDate: '2024-02-10',
        priority: 0,
      },
      {
        movieId: 101,
        title: 'Mai',
        durationMinutes: 120,
        status: 'SHOWING',
        releaseDate: '2024-02-10',
        priority: 1,
      },
    ],
  };

  const plansPage: PageResponse<SchedulePlanSummary> = {
    content: [planSummary],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };

  const makeLogsPage = (): PageResponse<GenerationLog> => ({
    content: [
      {
        id: 1,
        planId: 7,
        targetDate: '2026-12-01',
        outcome: 'SUCCESS',
        createdCount: 4,
        skippedCount: 0,
        message: 'Đã tạo 4 suất.',
        createdAt: '2026-12-01T00:30:00Z',
      },
      {
        id: 2,
        planId: 7,
        targetDate: '2026-12-02',
        outcome: 'PARTIAL',
        createdCount: 1,
        skippedCount: 2,
        message: 'Bỏ qua 2 khung bị chiếm.',
        createdAt: '2026-12-02T00:30:00Z',
      },
      {
        id: 3,
        planId: 7,
        targetDate: '2026-12-03',
        outcome: 'SKIPPED',
        createdCount: 0,
        skippedCount: 0,
        message: 'Phòng đang bảo trì.',
        createdAt: '2026-12-03T00:30:00Z',
      },
      {
        id: 4,
        planId: 7,
        targetDate: '2026-12-04',
        outcome: 'FAILED',
        createdCount: 0,
        skippedCount: 0,
        message: 'Lỗi hệ thống khi sinh lịch.',
        createdAt: '2026-12-04T00:30:00Z',
      },
    ],
    page: 0,
    size: 20,
    totalElements: 4,
    totalPages: 1,
  });

  const generationSummary: GenerationSummary = {
    planId: 7,
    from: '2026-12-01',
    to: '2026-12-02',
    createdCount: 5,
    skippedCount: 2,
    failedCount: 0,
    dates: [
      {
        date: '2026-12-01',
        outcome: 'SUCCESS',
        createdCount: 4,
        skippedCount: 0,
        message: 'Đã tạo 4 suất.',
      },
      {
        date: '2026-12-02',
        outcome: 'PARTIAL',
        createdCount: 1,
        skippedCount: 2,
        message: 'Bỏ qua 2 khung bị chiếm.',
      },
    ],
  };

  const LocationProbe = () => {
    const location = useLocation();
    return <div data-testid="location-search">{location.search}</div>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: adminUser,
      token: 'admin-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (role: string) => role === 'ADMIN',
    });

    vi.spyOn(adminCinemasApi, 'listCinemas').mockResolvedValue({
      content: mockCinemas,
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.spyOn(adminCinemasApi, 'listRooms').mockResolvedValue({
      content: mockRooms,
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
    });
    vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue({
      content: mockMovies,
      page: 0,
      size: 100,
      totalElements: 3,
      totalPages: 1,
    });

    vi.spyOn(adminSchedulePlansApi, 'list').mockResolvedValue(plansPage);
    vi.spyOn(adminSchedulePlansApi, 'getById').mockResolvedValue(planDetail);
    vi.spyOn(adminSchedulePlansApi, 'logs').mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
    vi.spyOn(adminSchedulePlansApi, 'generate').mockResolvedValue(generationSummary);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hiển thị danh sách kế hoạch và đồng bộ bộ lọc với URL', async () => {
    renderWithProviders(
      <>
        <AdminSchedulePlansPage />
        <LocationProbe />
      </>,
      { initialEntries: ['/admin/schedule-plans'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Lịch tối phòng 1')).toBeInTheDocument();
    });

    expect(screen.getByText('T2, T3, T4, T5, T6')).toBeInTheDocument();
    expect(screen.getByText('Cinema 1')).toBeInTheDocument();
    expect(screen.getAllByText('Đang bật').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'CGV Vincom Cần Thơ' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Cụm rạp'), { target: { value: '1' } });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cinema 1 (ACTIVE)' })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Phòng chiếu'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain('status=ACTIVE');
      expect(screen.getByTestId('location-search').textContent).toContain('cinemaId=1');
      expect(screen.getByTestId('location-search').textContent).toContain('roomId=10');
      expect(adminSchedulePlansApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ cinemaId: 1, roomId: 10, status: 'ACTIVE', page: 0 })
      );
    });
  });

  it('validate ngày, giờ và danh sách phim trước khi gửi', async () => {
    renderWithProviders(<AdminSchedulePlanFormPage />, {
      initialEntries: ['/admin/schedule-plans/new'],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tạo kế hoạch' }));
    expect(screen.getByText('Tên kế hoạch là bắt buộc.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tên kế hoạch'), {
      target: { value: 'Lịch tối phòng 1' },
    });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'CGV Vincom Cần Thơ' })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Cụm rạp'), { target: { value: '1' } });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cinema 1 (ACTIVE)' })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Phòng chiếu'), { target: { value: '10' } });

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-12-10' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo kế hoạch' }));
    expect(
      screen.getByText('Ngày kết thúc hiệu lực phải sau hoặc bằng ngày bắt đầu.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('Giờ đóng cửa'), { target: { value: '07:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo kế hoạch' }));
    expect(screen.getByText('Giờ đóng cửa phải sau giờ mở cửa.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Giờ đóng cửa'), { target: { value: '23:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo kế hoạch' }));
    expect(screen.getByText('Phải chọn ít nhất một phim.')).toBeInTheDocument();
  });

  it('gửi đúng payload khi tạo kế hoạch, giữ thứ tự ưu tiên phim', async () => {
    const createSpy = vi
      .spyOn(adminSchedulePlansApi, 'create')
      .mockResolvedValue(planDetail);

    renderWithProviders(
      <Routes>
        <Route path="/admin/schedule-plans/new" element={<AdminSchedulePlanFormPage />} />
        <Route path="/admin/schedule-plans" element={<div>Danh sách lịch tự động</div>} />
      </Routes>,
      { initialEntries: ['/admin/schedule-plans/new'] }
    );

    fireEvent.change(screen.getByLabelText('Tên kế hoạch'), {
      target: { value: 'Lịch tối phòng 1' },
    });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'CGV Vincom Cần Thơ' })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Cụm rạp'), { target: { value: '1' } });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Cinema 1 (ACTIVE)' })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Phòng chiếu'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-12-31' } });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Đào, Phở và Piano/ })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Thêm phim'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào danh sách' }));
    fireEvent.change(screen.getByLabelText('Thêm phim'), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào danh sách' }));

    fireEvent.click(screen.getByRole('button', { name: 'Đưa Mai lên' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo kế hoạch' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Lịch tối phòng 1',
        roomId: 10,
        effectiveFrom: '2026-12-01',
        effectiveTo: '2026-12-31',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        openTime: '08:00',
        closeTime: '23:00',
        slotStepMinutes: 15,
        cleanupMinutes: 15,
        basePrice: 75000,
        vipSurcharge: 20000,
        movieIds: [101, 100],
        status: 'ACTIVE',
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Danh sách lịch tự động')).toBeInTheDocument();
    });
  });

  it('hiển thị dữ liệu cũ khi sửa và cảnh báo thay đổi không ảnh hưởng suất đã sinh', async () => {
    vi.spyOn(adminSchedulePlansApi, 'logs').mockResolvedValue({
      content: [
        {
          id: 1,
          planId: 7,
          targetDate: '2026-12-01',
          outcome: 'SUCCESS',
          createdCount: 4,
          skippedCount: 0,
          message: null,
          createdAt: '2026-12-01T00:30:00Z',
        },
      ],
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
    });

    renderWithProviders(
      <Routes>
        <Route path="/admin/schedule-plans/:planId/edit" element={<AdminSchedulePlanFormPage />} />
      </Routes>,
      { initialEntries: ['/admin/schedule-plans/7/edit'] }
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Tên kế hoạch')).toHaveValue('Lịch tối phòng 1');
    });

    expect(screen.getByLabelText('Cụm rạp')).toHaveValue('1');
    await waitFor(() => {
      expect(screen.getByLabelText('Phòng chiếu')).toHaveValue('10');
    });
    expect(screen.getByLabelText('Từ ngày')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('Đến ngày')).toHaveValue('2099-12-31');
    expect(screen.getByLabelText('Trạng thái')).toHaveValue('ACTIVE');
    expect(screen.getByText('Đào, Phở và Piano')).toBeInTheDocument();
    expect(screen.getByText('Mai')).toBeInTheDocument();
    expect(
      screen.getByText('Thay đổi chỉ áp dụng cho các ngày chưa sinh. Suất đã sinh không bị sửa hoặc xóa.')
    ).toBeInTheDocument();
  });

  it('mở modal Sinh ngay, gọi API và hiển thị kết quả theo ngày', async () => {
    const generateSpy = vi
      .spyOn(adminSchedulePlansApi, 'generate')
      .mockResolvedValue(generationSummary);

    renderWithProviders(
      <Routes>
        <Route path="/admin/schedule-plans" element={<AdminSchedulePlansPage />} />
        <Route path="/admin/schedule-plans/:planId/logs" element={<div>Trang nhật ký</div>} />
      </Routes>,
      { initialEntries: ['/admin/schedule-plans'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Lịch tối phòng 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sinh ngay' }));

    const dialog = screen.getByRole('dialog', { name: 'Sinh lịch ngay' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sinh ngay' }));

    await waitFor(() => {
      expect(generateSpy).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ from: expect.any(String), to: expect.any(String) })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Đã tạo 5 suất/)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Thành công').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Một phần').length).toBeGreaterThan(0);
    expect(screen.getByText('Bỏ qua 2 khung bị chiếm.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xem nhật ký' }));
    await waitFor(() => {
      expect(screen.getByText('Trang nhật ký')).toBeInTheDocument();
    });
  });

  it('hiển thị đủ 4 kết quả nhật ký và link xem suất chiếu đúng URL', async () => {
    vi.spyOn(adminSchedulePlansApi, 'logs').mockResolvedValue(makeLogsPage());

    renderWithProviders(
      <Routes>
        <Route path="/admin/schedule-plans/:planId/logs" element={<AdminSchedulePlanLogsPage />} />
      </Routes>,
      { initialEntries: ['/admin/schedule-plans/7/logs'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Lịch tối phòng 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Thành công')).toBeInTheDocument();
    expect(screen.getByText('Một phần')).toBeInTheDocument();
    expect(screen.getAllByText('Bỏ qua').length).toBeGreaterThan(0);
    expect(screen.getByText('Thất bại')).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: 'Xem suất chiếu' });
    expect(links[0]).toHaveAttribute('href', '/admin/showtimes?roomId=10&date=2026-12-01&planId=7');
  });

  it('thêm mục Lịch tự động vào sidebar và đánh dấu active đúng route', () => {
    renderWithProviders(<AdminLayout />, {
      initialEntries: ['/admin/schedule-plans/7/logs'],
    });

    const link = screen.getByRole('link', { name: /lịch tự động/i });
    expect(link).toHaveAttribute('href', '/admin/schedule-plans');
    expect(link).toHaveAttribute('aria-current', 'page');
  });
});
