import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AdminShowtimesPage, AdminShowtimeFormPage } from '@/pages';
import { adminShowtimesApi } from '@/features/showtimes';
import type {
  ShowtimeResponse,
  ShowtimeCreatedResponse,
} from '@/features/showtimes';
import { adminCinemasApi } from '@/features/cinemas';
import type { Cinema, RoomResponse } from '@/features/cinemas';
import { moviesApi } from '@/features/movies';
import type { Movie } from '@/features/movies';
import type { PageResponse } from '@/shared/types/api.types';
import * as authModule from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { renderWithProviders } from './test-utils';
import { AdminRoute } from '@/app/router/AdminRoute';

describe('FE-10: Admin Quản Lý Suất Chiếu (Showtimes)', () => {
  const adminUser = {
    id: 1,
    fullName: 'Quản trị viên',
    email: 'admin@cinema.com',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
  };

  const customerUser = {
    id: 2,
    fullName: 'Khách hàng',
    email: 'customer@cinema.com',
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
  };

  const mockCinemas: Cinema[] = [
    {
      id: 1,
      name: 'CGV Vincom Cần Thơ',
      address: 'Số 2 Hùng Vương, Ninh Kiều, Cần Thơ',
      status: 'ACTIVE',
    },
    {
      id: 2,
      name: 'CGV Sense City Cần Thơ',
      address: 'Đại Lộ Hòa Bình, Ninh Kiều, Cần Thơ',
      status: 'ACTIVE',
    },
  ];

  const mockRoomsCinema1: RoomResponse[] = [
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
      posterUrl: 'https://example.com/poster1.jpg',
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
      posterUrl: 'https://example.com/poster2.jpg',
      status: 'SHOWING',
      releaseDate: '2024-02-10',
    },
    {
      id: 102,
      title: 'Phim Đang Ẩn (Hidden)',
      description: 'Phim chưa công bố',
      durationMinutes: 90,
      genre: 'Hành động',
      ageRating: 'P',
      posterUrl: 'https://example.com/hidden.jpg',
      status: 'HIDDEN',
      releaseDate: '2026-12-01',
    },
  ];

  const mockShowtimes: ShowtimeResponse[] = [
    {
      id: 501,
      movieId: 100,
      cinemaId: 1,
      cinemaName: 'CGV Vincom Cần Thơ',
      roomId: 10,
      roomName: 'Cinema 1',
      // 2026-11-10 14:00 VN = 2026-11-10T07:00:00Z
      startsAt: '2026-11-10T07:00:00Z',
      // 2026-11-10 16:00 VN = 2026-11-10T09:00:00Z
      endsAt: '2026-11-10T09:00:00Z',
      cleanupMinutes: 15,
      basePrice: 85000,
      vipSurcharge: 20000,
      status: 'SCHEDULED',
    },
    {
      id: 502,
      movieId: 101,
      cinemaId: 1,
      cinemaName: 'CGV Vincom Cần Thơ',
      roomId: 10,
      roomName: 'Cinema 1',
      // 2026-11-10 18:00 VN = 2026-11-10T11:00:00Z
      startsAt: '2026-11-10T11:00:00Z',
      // 2026-11-10 20:15 VN = 2026-11-10T13:15:00Z
      endsAt: '2026-11-10T13:15:00Z',
      cleanupMinutes: 20,
      basePrice: 90000,
      vipSurcharge: 25000,
      status: 'SCHEDULED',
    },
  ];

  const mockShowtimePageResponse: PageResponse<ShowtimeResponse> = {
    content: mockShowtimes,
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
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
      size: 10,
      totalElements: 2,
      totalPages: 1,
    });

    vi.spyOn(adminCinemasApi, 'listRooms').mockResolvedValue({
      content: mockRoomsCinema1,
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
    });

    vi.spyOn(adminCinemasApi, 'listSeats').mockResolvedValue([
      { id: 1, roomId: 10, seatRow: 'A', seatNumber: 1, label: 'A1', seatType: 'STANDARD', status: 'ACTIVE' },
    ]);

    vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue({
      content: mockMovies,
      page: 0,
      size: 10,
      totalElements: 3,
      totalPages: 1,
    });

    vi.spyOn(adminShowtimesApi, 'list').mockResolvedValue(mockShowtimePageResponse);
    vi.spyOn(adminShowtimesApi, 'getById').mockResolvedValue(mockShowtimes[0]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Phân quyền & Route Guard', () => {
    it('chặn người dùng CUSTOMER truy cập trang quản lý suất chiếu', async () => {
      vi.spyOn(authModule, 'useAuth').mockReturnValue({
        user: customerUser,
        token: 'customer-jwt-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        hasRole: () => false,
      });

      renderWithProviders(
        <Routes>
          <Route
            path="/admin/showtimes"
            element={
              <AdminRoute>
                <AdminShowtimesPage />
              </AdminRoute>
            }
          />
          <Route path="/" element={<div>Trang chủ công khai</div>} />
        </Routes>,
        { initialEntries: ['/admin/showtimes'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Trang chủ công khai')).toBeInTheDocument();
      });
      expect(screen.queryByText('Quản lý Suất Chiếu')).not.toBeInTheDocument();
    });

    it('cho phép ADMIN truy cập danh sách suất chiếu', async () => {
      renderWithProviders(
        <Routes>
          <Route
            path="/admin/showtimes"
            element={
              <AdminRoute>
                <AdminShowtimesPage />
              </AdminRoute>
            }
          />
        </Routes>,
        { initialEntries: ['/admin/showtimes'] }
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Quản lý Suất Chiếu' })).toBeInTheDocument();
        expect(screen.getAllByText('Đào, Phở và Piano').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('2. Danh sách Suất Chiếu Admin (AdminShowtimesPage)', () => {
    it('hiển thị danh sách suất chiếu kèm bộ lọc và thông tin phòng, giá vé, trạng thái', async () => {
      renderWithProviders(<AdminShowtimesPage />, { initialEntries: ['/admin/showtimes'] });

      await waitFor(() => {
        expect(screen.getAllByText('Đào, Phở và Piano').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Mai').length).toBeGreaterThanOrEqual(1);
      });

      expect(adminShowtimesApi.list).toHaveBeenCalledWith({
        cinemaId: undefined,
        roomId: undefined,
        movieId: undefined,
        date: undefined,
        status: undefined,
        page: 0,
        size: 20,
        sort: 'startsAt,asc',
      });

      // Hiển thị giá vé
      expect(screen.getByText(/85.000/i)).toBeInTheDocument();
      expect(screen.getByText(/90.000/i)).toBeInTheDocument();
      // Hiển thị badge trạng thái SCHEDULED (label: Đã lên lịch)
      const scheduledBadges = screen.getAllByText(/Đã lên lịch/i);
      expect(scheduledBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('thay đổi cụm rạp reset phòng chiếu đã chọn và cập nhật URL params', async () => {
      renderWithProviders(<AdminShowtimesPage />, { initialEntries: ['/admin/showtimes?cinemaId=1&roomId=10'] });

      await waitFor(() => {
        expect(screen.getAllByText('Đào, Phở và Piano').length).toBeGreaterThanOrEqual(1);
      });

      const cinemaSelect = screen.getByLabelText(/Cụm rạp/i);
      fireEvent.change(cinemaSelect, { target: { value: '2' } });

      await waitFor(() => {
        expect(adminShowtimesApi.list).toHaveBeenCalledWith(
          expect.objectContaining({
            cinemaId: 2,
            roomId: undefined,
            page: 0,
          })
        );
      });
    });

    it('nút Xóa bộ lọc khôi phục toàn bộ tham số tìm kiếm về mặc định', async () => {
      renderWithProviders(<AdminShowtimesPage />, { initialEntries: ['/admin/showtimes?cinemaId=1&date=2026-11-10'] });

      await waitFor(() => {
        expect(screen.getByText('Xóa bộ lọc')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Xóa bộ lọc'));

      await waitFor(() => {
        expect(adminShowtimesApi.list).toHaveBeenCalledWith(
          expect.objectContaining({
            cinemaId: undefined,
            roomId: undefined,
            movieId: undefined,
            date: undefined,
            status: undefined,
            page: 0,
          })
        );
      });
    });
  });

  describe('3. Form Tạo Suất Chiếu Mới (AdminShowtimeFormPage - Create)', () => {
    it('chặn gửi khi tải ghế lỗi và cho phép thử lại', async () => {
      vi.spyOn(adminCinemasApi, 'listSeats')
        .mockRejectedValueOnce(new Error('Không thể tải ghế'))
        .mockResolvedValue([{ id: 1, roomId: 10, seatRow: 'A', seatNumber: 1, label: 'A1', seatType: 'STANDARD', status: 'ACTIVE' }]);
      renderWithProviders(<AdminShowtimeFormPage />, { initialEntries: ['/admin/showtimes/new?cinemaId=1&roomId=10'] });

      const retryButton = await screen.findByRole('button', { name: 'Thử lại' });
      expect(screen.getByRole('button', { name: 'Tạo suất chiếu' })).toBeDisabled();
      fireEvent.click(retryButton);
      expect(await screen.findByText(/Phòng có 1 ghế ACTIVE/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tạo suất chiếu' })).toBeEnabled();
    });

    it.each(['empty', 'maintenance'] as const)('chặn tạo suất với phòng không có ghế ACTIVE (%s) và dẫn đến cấu hình ghế', async (state) => {
      vi.spyOn(adminCinemasApi, 'listSeats').mockResolvedValue(state === 'empty' ? [] : [
        { id: 1, roomId: 10, seatRow: 'A', seatNumber: 1, label: 'A1', seatType: 'STANDARD', status: 'MAINTENANCE' },
      ]);
      const createSpy = vi.spyOn(adminShowtimesApi, 'create');
      renderWithProviders(<AdminShowtimeFormPage />, { initialEntries: ['/admin/showtimes/new?cinemaId=1&roomId=10'] });

      expect(await screen.findByText(/Phòng chiếu chưa có ghế ACTIVE/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Cấu hình ghế phòng chiếu' })).toHaveAttribute('href', '/admin/rooms/10/seats');
      expect(screen.getByRole('button', { name: 'Tạo suất chiếu' })).toBeDisabled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('kiểm tra lại ghế khi đổi phòng và không giữ cảnh báo của phòng cũ', async () => {
      vi.spyOn(adminCinemasApi, 'listRooms').mockResolvedValue({
        content: [...mockRoomsCinema1, { id: 12, cinemaId: 1, name: 'Cinema 3', status: 'ACTIVE' }],
        page: 0, size: 100, totalElements: 3, totalPages: 1,
      });
      vi.spyOn(adminCinemasApi, 'listSeats').mockImplementation(async (id) => id === 10 ? [] : [
        { id: 2, roomId: id, seatRow: 'A', seatNumber: 1, label: 'A1', seatType: 'STANDARD', status: 'ACTIVE' },
      ]);
      renderWithProviders(<AdminShowtimeFormPage />, { initialEntries: ['/admin/showtimes/new?cinemaId=1&roomId=10'] });
      await screen.findByText(/Phòng chiếu chưa có ghế ACTIVE/);
      await screen.findByRole('option', { name: 'Cinema 3' });
      fireEvent.change(screen.getByLabelText(/Phòng chiếu/i), { target: { value: '12' } });

      expect(await screen.findByText(/Phòng có 1 ghế ACTIVE/)).toBeInTheDocument();
      expect(screen.queryByText(/Phòng chiếu chưa có ghế ACTIVE/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tạo suất chiếu' })).toBeEnabled();
    });

    it('lọc bỏ phim HIDDEN khỏi danh sách chọn phim chiếu', async () => {
      renderWithProviders(<AdminShowtimeFormPage />, { initialEntries: ['/admin/showtimes/new'] });

      await waitFor(() => {
        expect(screen.getByText('1. Chọn Phim Chiếu')).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /Phim chiếu/i })).toBeInTheDocument();
      });

      const movieSelect = screen.getByRole('combobox', { name: /Phim chiếu/i });
      expect(movieSelect).toBeInTheDocument();

      // Phim SHOWING phải có mặt
      expect(screen.getByRole('option', { name: /Đào, Phở và Piano/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Mai/i })).toBeInTheDocument();
      // Phim HIDDEN bị loại trừ
      expect(screen.queryByRole('option', { name: /Phim Đang Ẩn/i })).not.toBeInTheDocument();
    });

    it('gợi ý giờ kết thúc tự động từ thời lượng phim và tính thời điểm phòng sẵn sàng', async () => {
      renderWithProviders(<AdminShowtimeFormPage />, { initialEntries: ['/admin/showtimes/new'] });

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Phim chiếu/i })).toBeInTheDocument();
      });

      // Chọn phim "Đào, Phở và Piano" (100 phút)
      const movieSelect = screen.getByRole('combobox', { name: /Phim chiếu/i });
      fireEvent.change(movieSelect, { target: { value: '100' } });

      // Nhập giờ bắt đầu: 2026-11-15T09:00 (giờ VN)
      const startsAtInput = screen.getByLabelText(/Bắt đầu chiếu/i);
      fireEvent.change(startsAtInput, { target: { value: '2026-11-15T09:00' } });

      // Click nút "Gợi ý giờ kết thúc (+100m)"
      await waitFor(() => {
        expect(screen.getByText(/Gợi ý giờ kết thúc/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Gợi ý giờ kết thúc/i));

      // Giờ kết thúc tự động điền: 09:00 + 100m = 10:40
      const endsAtInput = screen.getByLabelText(/Kết thúc chiếu/i) as HTMLInputElement;
      expect(endsAtInput.value).toBe('2026-11-15T10:40');

      // Thời điểm phòng sẵn sàng (+15 phút cleanup) = 10:55
      await waitFor(() => {
        expect(screen.getByText(/2026-11-15 10:55/i)).toBeInTheDocument();
      });
    });

    it('chuyển đổi input giờ Việt Nam sang UTC ISO string Z độc lập múi giờ máy và gửi POST thành công', async () => {
      const mockCreatedResult: ShowtimeCreatedResponse = {
        showtime: {
          id: 601,
          movieId: 100,
          cinemaId: 1,
          cinemaName: 'CGV Vincom Cần Thơ',
          roomId: 10,
          roomName: 'Cinema 1',
          startsAt: '2026-11-15T02:00:00Z', // 09:00 VN = 02:00 UTC
          endsAt: '2026-11-15T03:40:00Z',   // 10:40 VN = 03:40 UTC
          cleanupMinutes: 15,
          basePrice: 80000,
          vipSurcharge: 20000,
          status: 'SCHEDULED',
        },
        createdSeatCount: 45,
      };

      const createSpy = vi.spyOn(adminShowtimesApi, 'create').mockResolvedValue(mockCreatedResult);

      renderWithProviders(<AdminShowtimeFormPage />, { initialEntries: ['/admin/showtimes/new'] });

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Phim chiếu/i })).toBeInTheDocument();
      });

      // 1. Chọn phim (100 phút)
      fireEvent.change(screen.getByRole('combobox', { name: /Phim chiếu/i }), { target: { value: '100' } });

      // 2. Chọn rạp & phòng
      fireEvent.change(screen.getByLabelText(/Cụm rạp/i), { target: { value: '1' } });
      await waitFor(() => {
        expect(screen.getByLabelText(/Phòng chiếu/i)).not.toBeDisabled();
      });
      fireEvent.change(screen.getByLabelText(/Phòng chiếu/i), { target: { value: '10' } });

      // 3. Thời gian: 2026-11-15 09:00 VN đến 10:40 VN
      fireEvent.change(screen.getByLabelText(/Bắt đầu chiếu/i), { target: { value: '2026-11-15T09:00' } });
      fireEvent.change(screen.getByLabelText(/Kết thúc chiếu/i), { target: { value: '2026-11-15T10:40' } });
      fireEvent.change(screen.getByLabelText(/Thời gian dọn phòng/i), { target: { value: '15' } });

      // 4. Giá vé
      fireEvent.change(screen.getByLabelText(/Giá vé cơ bản/i), { target: { value: '80000' } });
      fireEvent.change(screen.getByLabelText(/Phụ thu ghế VIP/i), { target: { value: '20000' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: 'Tạo suất chiếu' });
      await waitFor(() => expect(submitBtn).toBeEnabled());
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith({
          movieId: 100,
          roomId: 10,
          // 09:00 VN (+07:00) -> 02:00 UTC có chữ Z rõ ràng
          startsAt: '2026-11-15T02:00:00.000Z',
          // 10:40 VN (+07:00) -> 03:40 UTC có chữ Z rõ ràng
          endsAt: '2026-11-15T03:40:00.000Z',
          cleanupMinutes: 15,
          basePrice: 80000,
          vipSurcharge: 20000,
        });
      });

      // Hiển thị banner thành công với số lượng ghế tồn kho đã tạo
      await waitFor(() => {
        expect(screen.getByText('Tạo suất chiếu thành công!')).toBeInTheDocument();
        expect(screen.getByText(/45 ghế hoạt động/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Kiểm tra sơ đồ ghế & tồn kho/i })).toHaveAttribute(
          'href',
          '/showtimes/601/seats'
        );
      });
    });

    it('báo lỗi khi thời lượng chiếu nhỏ hơn thời lượng phim', async () => {
      renderWithProviders(<AdminShowtimeFormPage />, { initialEntries: ['/admin/showtimes/new'] });

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Phim chiếu/i })).toBeInTheDocument();
      });

      // Phim Mai: 120 phút
      fireEvent.change(screen.getByRole('combobox', { name: /Phim chiếu/i }), { target: { value: '101' } });
      fireEvent.change(screen.getByLabelText(/Cụm rạp/i), { target: { value: '1' } });
      await waitFor(() => {
        expect(screen.getByLabelText(/Phòng chiếu/i)).not.toBeDisabled();
      });
      fireEvent.change(screen.getByLabelText(/Phòng chiếu/i), { target: { value: '10' } });

      // Chỉ cho chiếu 60 phút (từ 09:00 đến 10:00)
      fireEvent.change(screen.getByLabelText(/Bắt đầu chiếu/i), { target: { value: '2026-11-15T09:00' } });
      fireEvent.change(screen.getByLabelText(/Kết thúc chiếu/i), { target: { value: '2026-11-15T10:00' } });

      const submitBtn = screen.getByRole('button', { name: 'Tạo suất chiếu' });
      await waitFor(() => expect(submitBtn).toBeEnabled());
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Thời lượng chiếu không đủ cho phim "Mai"/i)).toBeInTheDocument();
      });
    });

    it('xử lý lỗi 409 SHOWTIME_OVERLAP khi phòng bị trùng lịch chiếu bao gồm cleanup', async () => {
      vi.spyOn(adminShowtimesApi, 'create').mockRejectedValue(
        new ApiErrorResponse(
          'Showtime overlaps with another showtime in the room',
          'SHOWTIME_OVERLAP',
          409
        )
      );

      renderWithProviders(<AdminShowtimeFormPage />, { initialEntries: ['/admin/showtimes/new'] });

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /Phim chiếu/i })).toBeInTheDocument();
      });

      fireEvent.change(screen.getByRole('combobox', { name: /Phim chiếu/i }), { target: { value: '100' } });
      fireEvent.change(screen.getByLabelText(/Cụm rạp/i), { target: { value: '1' } });
      await waitFor(() => {
        expect(screen.getByLabelText(/Phòng chiếu/i)).not.toBeDisabled();
      });
      fireEvent.change(screen.getByLabelText(/Phòng chiếu/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/Bắt đầu chiếu/i), { target: { value: '2026-11-15T09:00' } });
      fireEvent.change(screen.getByLabelText(/Kết thúc chiếu/i), { target: { value: '2026-11-15T11:00' } });

      const submitBtn = screen.getByRole('button', { name: 'Tạo suất chiếu' });
      await waitFor(() => expect(submitBtn).toBeEnabled());
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Suất chiếu bị trùng thời gian tại phòng chiếu này/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('4. Form Sửa Suất Chiếu (AdminShowtimeFormPage - Edit)', () => {
    it('tải chi tiết suất chiếu, chuyển UTC thành giờ Việt Nam và gửi PUT nhận ShowtimeResponse trực tiếp', async () => {
      const updateSpy = vi.spyOn(adminShowtimesApi, 'update').mockResolvedValue({
        id: 501,
        movieId: 100,
        cinemaId: 1,
        cinemaName: 'CGV Vincom Cần Thơ',
        roomId: 10,
        roomName: 'Cinema 1',
        startsAt: '2026-11-10T08:00:00Z',
        endsAt: '2026-11-10T10:00:00Z',
        cleanupMinutes: 20,
        basePrice: 95000,
        vipSurcharge: 25000,
        status: 'SCHEDULED',
      });

      renderWithProviders(
        <Routes>
          <Route path="/admin/showtimes/:showtimeId/edit" element={<AdminShowtimeFormPage />} />
          <Route path="/admin/showtimes" element={<div>Danh sách suất chiếu</div>} />
        </Routes>,
        { initialEntries: ['/admin/showtimes/501/edit'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Chỉnh sửa Suất Chiếu #501')).toBeInTheDocument();
      });

      // Kiểm tra input đã được điền sẵn giờ Việt Nam (2026-11-10T07:00:00Z -> 14:00 VN)
      const startsInput = screen.getByLabelText(/Bắt đầu chiếu/i) as HTMLInputElement;
      expect(startsInput.value).toBe('2026-11-10T14:00');

      // Cập nhật giá vé mới: 95000
      const basePriceInput = screen.getByLabelText(/Giá vé cơ bản/i);
      fireEvent.change(basePriceInput, { target: { value: '95000' } });

      const submitBtn = screen.getByRole('button', { name: 'Cập nhật suất chiếu' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(501, expect.objectContaining({
          basePrice: 95000,
          roomId: 10,
          movieId: 100,
        }));
        expect(screen.getByText('Danh sách suất chiếu')).toBeInTheDocument();
      });
    });

    it('xử lý lỗi 409 RESOURCE_STATE_CONFLICT khi suất chiếu đã có booking hoặc inventory đang khóa', async () => {
      vi.spyOn(adminShowtimesApi, 'update').mockRejectedValue(
        new ApiErrorResponse(
          'Suất chiếu đã có lịch sử đặt vé hoặc phòng đã bị khóa; không thể sửa đổi.',
          'RESOURCE_STATE_CONFLICT',
          409
        )
      );

      renderWithProviders(
        <Routes>
          <Route path="/admin/showtimes/:showtimeId/edit" element={<AdminShowtimeFormPage />} />
        </Routes>,
        { initialEntries: ['/admin/showtimes/501/edit'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Chỉnh sửa Suất Chiếu #501')).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole('button', { name: 'Cập nhật suất chiếu' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Suất chiếu đã có lịch sử đặt vé hoặc phòng đã bị khóa/i)
        ).toBeInTheDocument();
      });
    });
  });
});
