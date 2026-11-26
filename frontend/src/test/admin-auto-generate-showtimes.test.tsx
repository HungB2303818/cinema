import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AdminAutoGenerateShowtimesPage } from '@/pages';
import {
  adminShowtimesApi,
  type BatchAutoGenerateShowtimesResponse,
} from '@/features/showtimes';
import { adminCinemasApi, type Cinema, type RoomResponse } from '@/features/cinemas';
import { moviesApi, type Movie } from '@/features/movies';
import type { PageResponse } from '@/shared/types/api.types';
import * as authModule from '@/features/auth';
import { AdminLayout } from '@/shared/components/layout/AdminLayout';
import { renderWithProviders } from './test-utils';

describe('Admin tạo suất chiếu tự động theo rạp & nhiều phòng', () => {
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
      address: 'Số 2 Hùng Vương, Cần Thơ',
      status: 'ACTIVE',
    },
  ];

  const mockRooms: RoomResponse[] = [
    { id: 10, cinemaId: 1, name: 'Phòng 1', status: 'ACTIVE' },
    { id: 11, cinemaId: 1, name: 'Phòng 2', status: 'ACTIVE' },
    { id: 12, cinemaId: 1, name: 'Phòng 3', status: 'MAINTENANCE' },
  ];

  const mockMovies: Movie[] = [
    {
      id: 100,
      title: 'Đào, Phở và Piano',
      description: 'Phim lịch sử',
      durationMinutes: 100,
      genre: 'Lịch sử',
      ageRating: 'T13',
      posterUrl: null,
      status: 'SHOWING',
      releaseDate: '2026-11-01',
    },
    {
      id: 101,
      title: 'Mai',
      description: 'Phim tâm lý',
      durationMinutes: 120,
      genre: 'Tâm lý',
      ageRating: 'T18',
      posterUrl: null,
      status: 'SHOWING',
      releaseDate: '2026-11-01',
    },
  ];

  const pageOf = <T,>(content: T[]): PageResponse<T> => ({
    content,
    page: 0,
    size: 100,
    totalElements: content.length,
    totalPages: 1,
  });

  const mockPreviewResponse: BatchAutoGenerateShowtimesResponse = {
    cinemaId: 1,
    cinemaName: 'CGV Vincom Cần Thơ',
    from: '2026-12-01',
    to: '2026-12-01',
    preview: true,
    totalPlannedCount: 2,
    totalCreatedCount: 0,
    totalSkippedCount: 0,
    totalFailedCount: 0,
    rooms: [
      {
        roomId: 10,
        roomName: 'Phòng 1',
        plannedCount: 1,
        createdCount: 0,
        skippedCount: 0,
        failedCount: 0,
        dates: [
          {
            date: '2026-12-01',
            outcome: 'SUCCESS',
            plannedCount: 1,
            createdCount: 0,
            skippedCount: 0,
            message: 'Dự kiến tạo 1 suất chiếu.',
            showtimes: [
              {
                movieId: 100,
                movieTitle: 'Đào, Phở và Piano',
                durationMinutes: 100,
                startsAt: '2026-12-01T01:00:00Z',
                endsAt: '2026-12-01T02:40:00Z',
              },
            ],
          },
        ],
      },
      {
        roomId: 11,
        roomName: 'Phòng 2',
        plannedCount: 1,
        createdCount: 0,
        skippedCount: 0,
        failedCount: 0,
        dates: [
          {
            date: '2026-12-01',
            outcome: 'SUCCESS',
            plannedCount: 1,
            createdCount: 0,
            skippedCount: 0,
            message: 'Dự kiến tạo 1 suất chiếu.',
            showtimes: [
              {
                movieId: 101,
                movieTitle: 'Mai',
                durationMinutes: 120,
                startsAt: '2026-12-01T01:15:00Z',
                endsAt: '2026-12-01T03:15:00Z',
              },
            ],
          },
        ],
      },
    ],
  };

  let getAdminMoviesSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: adminUser,
      token: 'admin-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (role) => role === 'ADMIN',
    });
    vi.spyOn(adminCinemasApi, 'listCinemas').mockResolvedValue(pageOf(mockCinemas));
    vi.spyOn(adminCinemasApi, 'listRooms').mockResolvedValue(pageOf(mockRooms));
    getAdminMoviesSpy = vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue(pageOf(mockMovies));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    renderWithProviders(
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="showtimes/auto-generate" element={<AdminAutoGenerateShowtimesPage />} />
        </Route>
      </Routes>,
      { initialEntries: ['/admin/showtimes/auto-generate'] }
    );

  it('không yêu cầu tên kế hoạch, hỗ trợ chọn nhiều phòng và xem trước / tạo suất chiếu', async () => {
    const previewSpy = vi
      .spyOn(adminShowtimesApi, 'previewAutoGenerate')
      .mockResolvedValue(mockPreviewResponse);
    const generateSpy = vi.spyOn(adminShowtimesApi, 'autoGenerate').mockResolvedValue({
      ...mockPreviewResponse,
      preview: false,
      totalCreatedCount: 2,
    });

    renderPage();

    expect(screen.queryByLabelText(/Tên kế hoạch/i)).not.toBeInTheDocument();
    await waitFor(() => expect(getAdminMoviesSpy).toHaveBeenCalledWith({ size: 100 }));

    const cinemaSelect = await screen.findByLabelText('Cụm rạp');
    await screen.findByRole('option', { name: 'CGV Vincom Cần Thơ' });
    fireEvent.change(cinemaSelect, { target: { value: '1' } });

    const selectAllRoomsBtn = await screen.findByRole('button', {
      name: /Chọn tất cả phòng hoạt động \(2\)/i,
    });
    fireEvent.click(selectAllRoomsBtn);

    fireEvent.click(await screen.findByText('Đào, Phở và Piano'));
    fireEvent.click(screen.getByText('Mai'));

    fireEvent.click(screen.getByRole('button', { name: /Xem trước lịch chiếu/i }));

    await waitFor(() => expect(previewSpy).toHaveBeenCalledTimes(1));
    expect(previewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cinemaId: 1,
        roomIds: [10, 11],
        movieIds: [100, 101],
      })
    );
    expect(await screen.findByText(/Dự kiến tạo 2 suất chiếu trên 2 phòng/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tạo suất chiếu ngay/i }));

    await waitFor(() => expect(generateSpy).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Đã tạo 2 suất chiếu/i)).toBeInTheDocument();
  });

  it('hiển thị thông báo lỗi khi tải danh sách phim thất bại', async () => {
    getAdminMoviesSpy.mockRejectedValue(new Error('page phải >= 0; size phải từ 1 đến 100.'));

    renderPage();

    expect(
      await screen.findByText(/page phải >= 0; size phải từ 1 đến 100\./i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });
});
