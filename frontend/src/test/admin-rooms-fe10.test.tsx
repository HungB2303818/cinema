import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AdminRoomsPage, AdminSeatsPage } from '@/pages';
import { adminCinemasApi } from '@/features/cinemas';
import type { Cinema, RoomResponse, SeatResponse } from '@/features/cinemas';
import type { PageResponse } from '@/shared/types/api.types';
import * as authModule from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { renderWithProviders } from './test-utils';
import { AdminRoute } from '@/app/router/AdminRoute';

describe('FE-10: Admin Phòng Chiếu & Ghế Vật Lý', () => {
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

  const mockRoomsCinema2: RoomResponse[] = [
    { id: 20, cinemaId: 2, name: 'Cinema Gold 1', status: 'ACTIVE' },
  ];

  const mockPhysicalSeats: SeatResponse[] = [
    { id: 101, roomId: 10, seatRow: 'A', seatNumber: 1, label: 'A1', seatType: 'STANDARD', status: 'ACTIVE' },
    { id: 102, roomId: 10, seatRow: 'A', seatNumber: 2, label: 'A2', seatType: 'STANDARD', status: 'ACTIVE' },
    { id: 103, roomId: 10, seatRow: 'B', seatNumber: 1, label: 'B1', seatType: 'VIP', status: 'ACTIVE' },
    { id: 104, roomId: 10, seatRow: 'B', seatNumber: 2, label: 'B2', seatType: 'VIP', status: 'MAINTENANCE' },
  ];

  const mockCinemaPageResponse: PageResponse<Cinema> = {
    content: mockCinemas,
    page: 0,
    size: 10,
    totalElements: 2,
    totalPages: 1,
  };

  const mockRoomPageResponse: PageResponse<RoomResponse> = {
    content: mockRoomsCinema1,
    page: 0,
    size: 10,
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

    vi.spyOn(adminCinemasApi, 'listCinemas').mockResolvedValue(mockCinemaPageResponse);
    vi.spyOn(adminCinemasApi, 'listRooms').mockResolvedValue(mockRoomPageResponse);
    vi.spyOn(adminCinemasApi, 'listSeats').mockResolvedValue(mockPhysicalSeats);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Phân quyền & Route Guard', () => {
    it('chặn người dùng CUSTOMER truy cập trang quản lý phòng', async () => {
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
            path="/admin/rooms"
            element={
              <AdminRoute>
                <AdminRoomsPage />
              </AdminRoute>
            }
          />
          <Route path="/" element={<div>Trang chủ công khai</div>} />
        </Routes>,
        { initialEntries: ['/admin/rooms'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Trang chủ công khai')).toBeInTheDocument();
      });
      expect(screen.queryByText('Quản lý Phòng Chiếu')).not.toBeInTheDocument();
    });

    it('cho phép ADMIN truy cập danh sách phòng chiếu', async () => {
      renderWithProviders(
        <Routes>
          <Route
            path="/admin/rooms"
            element={
              <AdminRoute>
                <AdminRoomsPage />
              </AdminRoute>
            }
          />
        </Routes>,
        { initialEntries: ['/admin/rooms'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Quản lý Phòng Chiếu')).toBeInTheDocument();
        expect(screen.getByText('CGV Vincom Cần Thơ')).toBeInTheDocument();
        expect(screen.getByText('Cinema 1')).toBeInTheDocument();
      });
    });
  });

  describe('2. Danh sách & Quản lý Phòng Chiếu (AdminRoomsPage)', () => {
    it('hiển thị danh sách rạp và danh sách phòng phân trang thật', async () => {
      renderWithProviders(<AdminRoomsPage />, { initialEntries: ['/admin/rooms?cinemaId=1'] });

      await waitFor(() => {
        expect(screen.getByText('CGV Vincom Cần Thơ')).toBeInTheDocument();
        expect(screen.getByText('CGV Sense City Cần Thơ')).toBeInTheDocument();
        expect(screen.getByText('Cinema 1')).toBeInTheDocument();
        expect(screen.getByText('Cinema 2')).toBeInTheDocument();
      });

      expect(adminCinemasApi.listCinemas).toHaveBeenCalledWith(0, 10, 'name,asc');
      expect(adminCinemasApi.listRooms).toHaveBeenCalledWith(1, 0, 10, 'id,asc');
    });

    it('chọn rạp khác cập nhật danh sách phòng của rạp mới', async () => {
      vi.spyOn(adminCinemasApi, 'listRooms').mockImplementation(async (cinemaId) => {
        if (cinemaId === 2) {
          return { content: mockRoomsCinema2, page: 0, size: 10, totalElements: 1, totalPages: 1 };
        }
        return mockRoomPageResponse;
      });

      renderWithProviders(<AdminRoomsPage />, { initialEntries: ['/admin/rooms?cinemaId=1'] });

      await waitFor(() => {
        expect(screen.getByText('Cinema 1')).toBeInTheDocument();
      });

      const cinema2Btn = screen.getByText('CGV Sense City Cần Thơ');
      fireEvent.click(cinema2Btn);

      await waitFor(() => {
        expect(screen.getByText('Cinema Gold 1')).toBeInTheDocument();
      });
    });

    it('tạo phòng chiếu mới: mở modal, validate và gửi POST', async () => {
      const createSpy = vi.spyOn(adminCinemasApi, 'createRoom').mockResolvedValue({
        id: 12,
        cinemaId: 1,
        name: 'Cinema 3 Mới',
        status: 'ACTIVE',
      });

      renderWithProviders(<AdminRoomsPage />, { initialEntries: ['/admin/rooms?cinemaId=1'] });

      await waitFor(() => {
        expect(screen.getByText('Thêm phòng chiếu')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Thêm phòng chiếu'));

      const input = screen.getByPlaceholderText(/Ví dụ: Cinema 1/i);
      fireEvent.change(input, { target: { value: 'Cinema 3 Mới' } });

      const submitBtn = screen.getByRole('button', { name: 'Tạo phòng' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith({
          cinemaId: 1,
          name: 'Cinema 3 Mới',
          status: 'ACTIVE',
        });
      });
    });

    it('sửa phòng chiếu: mở modal, sửa tên và gửi PUT', async () => {
      const updateSpy = vi.spyOn(adminCinemasApi, 'updateRoom').mockResolvedValue({
        id: 10,
        cinemaId: 1,
        name: 'Cinema 1 IMAX',
        status: 'ACTIVE',
      });

      renderWithProviders(<AdminRoomsPage />, { initialEntries: ['/admin/rooms?cinemaId=1'] });

      await waitFor(() => {
        expect(screen.getByText('Cinema 1')).toBeInTheDocument();
      });

      // Click "Sửa" button for Cinema 1
      const editBtns = screen.getAllByRole('button', { name: /Sửa/i });
      fireEvent.click(editBtns[0]);

      const input = screen.getByDisplayValue('Cinema 1');
      fireEvent.change(input, { target: { value: 'Cinema 1 IMAX' } });

      const submitBtn = screen.getByRole('button', { name: 'Cập nhật phòng' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(10, {
          cinemaId: 1,
          name: 'Cinema 1 IMAX',
          status: 'ACTIVE',
        });
      });
    });

    it('xử lý lỗi 409 RESOURCE_STATE_CONFLICT khi phòng đã có suất chiếu', async () => {
      vi.spyOn(adminCinemasApi, 'updateRoom').mockRejectedValue(
        new ApiErrorResponse(
          'Phòng đã có suất chiếu; không thay đổi cấu hình phòng/ghế trong MVP.',
          'RESOURCE_STATE_CONFLICT',
          409
        )
      );

      renderWithProviders(<AdminRoomsPage />, { initialEntries: ['/admin/rooms?cinemaId=1'] });

      await waitFor(() => {
        expect(screen.getByText('Cinema 1')).toBeInTheDocument();
      });

      const editBtns = screen.getAllByRole('button', { name: /Sửa/i });
      fireEvent.click(editBtns[0]);

      const submitBtn = screen.getByRole('button', { name: 'Cập nhật phòng' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Phòng đã có suất chiếu/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Sơ đồ Ghế Vật Lý (AdminSeatsPage)', () => {
    it('deep link tải trực tiếp danh sách ghế vật lý theo roomId trên URL', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/admin/rooms/:roomId/seats" element={<AdminSeatsPage />} />
        </Routes>,
        { initialEntries: ['/admin/rooms/10/seats'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Sơ đồ Ghế Vật Lý')).toBeInTheDocument();
        expect(screen.getByText('MÀN CHIẾU (SCREEN)')).toBeInTheDocument();
      });

      expect(adminCinemasApi.listSeats).toHaveBeenCalledWith(10);
      expect(screen.getByTitle(/A1 - STANDARD - ACTIVE/i)).toBeInTheDocument();
      expect(screen.getByTitle(/B1 - VIP - ACTIVE/i)).toBeInTheDocument();
      expect(screen.getByTitle(/B2 - VIP - MAINTENANCE/i)).toBeInTheDocument();
    });

    it('tạo loạt ghế (batch): preview hợp lệ và gọi POST nguyên batch atomic', async () => {
      const createSeatsSpy = vi.spyOn(adminCinemasApi, 'createSeats').mockResolvedValue(mockPhysicalSeats);

      renderWithProviders(
        <Routes>
          <Route path="/admin/rooms/:roomId/seats" element={<AdminSeatsPage />} />
        </Routes>,
        { initialEntries: ['/admin/rooms/10/seats'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Khởi tạo loạt ghế (Batch)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Khởi tạo loạt ghế (Batch)'));

      // Configure batch: Từ hàng A đến C, 5 ghế mỗi hàng
      const endRowInput = screen.getByLabelText(/Đến hàng/i);
      fireEvent.change(endRowInput, { target: { value: 'C' } });

      const seatsPerRowInput = screen.getByLabelText(/Số ghế \/ hàng/i);
      fireEvent.change(seatsPerRowInput, { target: { value: '5' } });

      // Verify preview shows 15 seats (A1..A5, B1..B5, C1..C5)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Xác nhận tạo 15 ghế/i })).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: /Xác nhận tạo 15 ghế/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(createSeatsSpy).toHaveBeenCalledTimes(1);
        const callArg = createSeatsSpy.mock.calls[0];
        expect(callArg[0]).toBe(10);
        expect(callArg[1].seats.length).toBe(15);
        expect(callArg[1].seats[0]).toEqual({
          seatRow: 'A',
          seatNumber: 1,
          seatType: 'STANDARD',
          status: 'ACTIVE',
        });
      });
    });

    it('xử lý lỗi 409 RESOURCE_STATE_CONFLICT khi tạo batch ghế cho phòng đã có suất', async () => {
      vi.spyOn(adminCinemasApi, 'createSeats').mockRejectedValue(
        new ApiErrorResponse(
          'Phòng đã có suất chiếu; không thay đổi cấu hình phòng/ghế trong MVP.',
          'RESOURCE_STATE_CONFLICT',
          409
        )
      );

      renderWithProviders(
        <Routes>
          <Route path="/admin/rooms/:roomId/seats" element={<AdminSeatsPage />} />
        </Routes>,
        { initialEntries: ['/admin/rooms/10/seats'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Khởi tạo loạt ghế (Batch)')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Khởi tạo loạt ghế (Batch)'));

      const confirmBtn = screen.getByRole('button', { name: /Xác nhận tạo/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Phòng đã có suất chiếu/i)).toBeInTheDocument();
      });
    });

    it('sửa một ghế: nhấp vào ghế, đổi sang VIP và MAINTENANCE và gửi PUT', async () => {
      const updateSeatSpy = vi.spyOn(adminCinemasApi, 'updateSeat').mockResolvedValue({
        id: 101,
        roomId: 10,
        seatRow: 'A',
        seatNumber: 1,
        label: 'A1',
        seatType: 'VIP',
        status: 'MAINTENANCE',
      });

      renderWithProviders(
        <Routes>
          <Route path="/admin/rooms/:roomId/seats" element={<AdminSeatsPage />} />
        </Routes>,
        { initialEntries: ['/admin/rooms/10/seats'] }
      );

      await waitFor(() => {
        expect(screen.getByTitle(/A1 - STANDARD - ACTIVE/i)).toBeInTheDocument();
      });

      const seatBtn = screen.getByTitle(/A1 - STANDARD - ACTIVE/i);
      fireEvent.click(seatBtn);

      // In modal: change type to VIP
      const typeSelect = screen.getByLabelText(/Loại ghế/i);
      fireEvent.change(typeSelect, { target: { value: 'VIP' } });

      // Change status to MAINTENANCE
      const statusSelect = screen.getByLabelText(/Trạng thái vật lý/i);
      fireEvent.change(statusSelect, { target: { value: 'MAINTENANCE' } });

      const saveBtn = screen.getByRole('button', { name: 'Lưu thay đổi' });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateSeatSpy).toHaveBeenCalledWith(10, 101, {
          seatRow: 'A',
          seatNumber: 1,
          seatType: 'VIP',
          status: 'MAINTENANCE',
        });
      });
    });
  });
});
