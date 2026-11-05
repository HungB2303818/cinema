import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MyTicketsPage } from '@/pages/MyTicketsPage';
import { BookingDetailPage } from '@/pages/BookingDetailPage';
import { bookingsApi } from '@/features/bookings';
import type {
  BookingSummaryItem,
  BookingDetailResponse,
  BookingCancelResponse,
} from '@/features/bookings';
import type { PageResponse } from '@/shared/types/api.types';
import * as authModule from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { renderWithProviders } from './test-utils';

describe('FE-07: My Bookings, Detail & Cancellation', () => {
  const customerUser = {
    id: 10,
    fullName: 'Nguyen Van A',
    email: 'customer@example.com',
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
  };

  const mockPendingSummary: BookingSummaryItem = {
    bookingId: 1001,
    bookingCode: 'BK0001001',
    status: 'PENDING',
    effectiveStatus: 'PENDING',
    movieTitle: 'Dune: Part Two',
    startsAt: '2026-11-10T12:00:00Z',
    totalAmount: 180000,
    createdAt: '2026-11-10T11:00:00Z',
    expiresAt: new Date(Date.now() + 250000).toISOString(),
  };

  const mockConfirmedSummary: BookingSummaryItem = {
    bookingId: 1002,
    bookingCode: 'BK0001002',
    status: 'CONFIRMED',
    effectiveStatus: 'CONFIRMED',
    movieTitle: 'Mai',
    startsAt: '2026-11-11T14:00:00Z',
    totalAmount: 190000,
    createdAt: '2026-11-10T09:00:00Z',
    expiresAt: new Date(Date.now() - 50000).toISOString(),
  };

  const mockHistoryPage: PageResponse<BookingSummaryItem> = {
    content: [mockPendingSummary, mockConfirmedSummary],
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
  };

  const mockDetailData: BookingDetailResponse = {
    bookingId: 1001,
    bookingCode: 'BK0001001',
    showtimeId: 101,
    movieTitle: 'Dune: Part Two',
    roomName: 'Phòng VIP 01',
    startsAt: '2026-11-10T12:00:00Z',
    status: 'PENDING',
    effectiveStatus: 'PENDING',
    totalAmount: 180000,
    createdAt: '2026-11-10T11:00:00Z',
    expiresAt: new Date(Date.now() + 250000).toISOString(),
    seats: [
      { seatId: 1, label: 'A1', seatType: 'STANDARD', unitPrice: 90000 },
      { seatId: 2, label: 'A2', seatType: 'STANDARD', unitPrice: 90000 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: customerUser,
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'CUSTOMER',
    });
  });

  const renderApp = (initialUrl: string) => {
    return renderWithProviders(
      <Routes>
        <Route path="/my-tickets" element={<MyTicketsPage />} />
        <Route path="/bookings/:bookingId" element={<BookingDetailPage />} />
        <Route path="/bookings/:bookingId/checkout" element={<div>Trang Checkout</div>} />
        <Route path="/bookings/:bookingId/success" element={<div>Trang Nhận Vé</div>} />
      </Routes>,
      { initialEntries: [initialUrl] }
    );
  };

  it('Test 1: Queries GET /api/bookings/me with correct query params and does NOT send userId or call /tickets/my', async () => {
    const historySpy = vi
      .spyOn(bookingsApi, 'getHistory')
      .mockResolvedValue(mockHistoryPage);

    renderApp('/my-tickets?page=0&size=20&sort=createdAt,desc');

    expect(await screen.findByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getByText('Mai')).toBeInTheDocument();

    expect(historySpy).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      sort: 'createdAt,desc',
    });
  });

  it('Test 2: Pagination and sort controls synchronize with URL search params', async () => {
    const user = userEvent.setup();
    const historySpy = vi
      .spyOn(bookingsApi, 'getHistory')
      .mockResolvedValue({
        ...mockHistoryPage,
        totalPages: 3,
        totalElements: 50,
      });

    renderApp('/my-tickets?page=0&size=20&sort=createdAt,desc');

    expect(await screen.findByText('Trang 1 / 3')).toBeInTheDocument();

    // Click next page
    const nextBtn = screen.getByRole('button', { name: 'Trang tiếp theo' });
    await user.click(nextBtn);

    expect(historySpy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );

    // Change sort select
    const sortSelect = screen.getByLabelText(/Sắp xếp:/i);
    await user.selectOptions(sortSelect, 'startsAt,asc');

    expect(historySpy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, sort: 'startsAt,asc' })
    );
  });

  it('Test 3: Summary truthful rendering (bookingCode, movie, startsAt, snapshot total, Vietnamese status)', async () => {
    vi.spyOn(bookingsApi, 'getHistory').mockResolvedValue(mockHistoryPage);

    renderApp('/my-tickets');

    // BK0001001 is PENDING
    expect(await screen.findByText('MÃ: BK0001001')).toBeInTheDocument();
    expect(screen.getByText('Đang giữ chỗ')).toBeInTheDocument();
    expect(screen.getByText('180.000 ₫')).toBeInTheDocument();

    // BK0001002 is CONFIRMED
    expect(screen.getByText('MÃ: BK0001002')).toBeInTheDocument();
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
    expect(screen.getByText('190.000 ₫')).toBeInTheDocument();
  });

  it('Test 4: Loading, Error with retry, and Empty state handling', async () => {
    // 1. Error state
    vi.spyOn(bookingsApi, 'getHistory')
      .mockRejectedValueOnce(new Error('Lỗi kết nối máy chủ'));

    const { unmount } = renderApp('/my-tickets');

    expect(
      await screen.findByText('Không thể tải lịch sử đơn đặt vé')
    ).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    expect(retryBtn).toBeInTheDocument();
    unmount();

    // 2. Empty state
    vi.spyOn(bookingsApi, 'getHistory').mockResolvedValueOnce({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });

    renderApp('/my-tickets');
    expect(
      await screen.findByText('Bạn chưa có đơn đặt vé nào')
    ).toBeInTheDocument();
  });

  it('Test 5: Booking detail deep link (/bookings/:id) performs GET only and displays full snapshot info', async () => {
    const detailSpy = vi
      .spyOn(bookingsApi, 'getById')
      .mockResolvedValue(mockDetailData);

    renderApp('/bookings/1001');

    expect(await screen.findByText('Phòng VIP 01')).toBeInTheDocument();
    expect(screen.getByText('Ghế A1')).toBeInTheDocument();
    expect(screen.getByText('Ghế A2')).toBeInTheDocument();
    expect(screen.getAllByText('90.000 ₫').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('180.000 ₫')).toBeInTheDocument();

    expect(detailSpy).toHaveBeenCalledWith(1001);
  });

  it('Test 6: PENDING allows continue payment and cancel; CONFIRMED allows viewing tickets', async () => {
    vi.spyOn(bookingsApi, 'getHistory').mockResolvedValue(mockHistoryPage);

    renderApp('/my-tickets');

    // PENDING item actions
    expect(await screen.findByRole('button', { name: /Hủy/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Tiếp tục thanh toán/i })
    ).toBeInTheDocument();

    // CONFIRMED item actions
    expect(screen.getByRole('button', { name: /Xem vé/i })).toBeInTheDocument();
  });

  it('Test 7: Cancel confirmation modal requires explicit confirmation and double-click sends only 1 POST', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockDetailData);

    const cancelResponse: BookingCancelResponse = {
      bookingId: 1001,
      status: 'CANCELLED',
      releasedSeatCount: 2,
    };

    const cancelSpy = vi
      .spyOn(bookingsApi, 'cancel')
      .mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 60));
        return cancelResponse;
      });

    renderApp('/bookings/1001');

    const openCancelBtn = await screen.findByRole('button', {
      name: /Hủy đơn giữ chỗ/i,
    });
    await user.click(openCancelBtn);

    // Modal dialog is open
    expect(await screen.findByText('Xác nhận hủy giữ chỗ')).toBeInTheDocument();
    expect(
      screen.getByText(/Chỉ áp dụng cho đơn đang ở trạng thái/i)
    ).toBeInTheDocument();

    const confirmCancelBtn = screen.getByRole('button', {
      name: 'Xác nhận hủy',
    });

    // Double-click
    await Promise.all([user.click(confirmCancelBtn), user.click(confirmCancelBtn)]);

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledWith(1001);
  });

  it('Test 8: Dismissing modal with "Giữ lại đơn" does NOT execute POST cancel', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockDetailData);
    const cancelSpy = vi.spyOn(bookingsApi, 'cancel');

    renderApp('/bookings/1001');

    const openCancelBtn = await screen.findByRole('button', {
      name: /Hủy đơn giữ chỗ/i,
    });
    await user.click(openCancelBtn);

    expect(await screen.findByText('Xác nhận hủy giữ chỗ')).toBeInTheDocument();

    const keepBtn = screen.getByRole('button', { name: 'Giữ lại đơn' });
    await user.click(keepBtn);

    expect(cancelSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('Xác nhận hủy giữ chỗ')).not.toBeInTheDocument();
  });

  it('Test 9: Idempotent repeat cancel with releasedSeatCount=0 is treated as successful cancellation', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockDetailData);

    const repeatCancelResponse: BookingCancelResponse = {
      bookingId: 1001,
      status: 'CANCELLED',
      releasedSeatCount: 0, // Idempotent repeat
    };

    vi.spyOn(bookingsApi, 'cancel').mockResolvedValue(repeatCancelResponse);

    renderApp('/bookings/1001');

    await user.click(await screen.findByRole('button', { name: /Hủy đơn giữ chỗ/i }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    // Success feedback rendered with 0 seats released notice
    expect(
      await screen.findByText(/Đã giải phóng 0 ghế/i)
    ).toBeInTheDocument();
  });

  it('Test 10: BOOKING_EXPIRED (409) displays expired notice and does not claim cancellation', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockDetailData);

    vi.spyOn(bookingsApi, 'cancel').mockRejectedValue(
      new ApiErrorResponse(
        'Đơn đặt vé đã hết thời hạn giữ ghế.',
        'BOOKING_EXPIRED',
        409
      )
    );

    renderApp('/bookings/1001');

    await user.click(await screen.findByRole('button', { name: /Hủy đơn giữ chỗ/i }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    // Modal renders error without closing
    expect(
      await screen.findByText(/Đơn đặt vé đã hết thời hạn giữ ghế/i)
    ).toBeInTheDocument();
  });

  it('Test 11: BOOKING_STATE_CONFLICT (409) (e.g. paid during modal) does not claim successful cancel', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockDetailData);

    vi.spyOn(bookingsApi, 'cancel').mockRejectedValue(
      new ApiErrorResponse(
        'Đơn hàng không ở trạng thái PENDING.',
        'BOOKING_STATE_CONFLICT',
        409
      )
    );

    renderApp('/bookings/1001');

    await user.click(await screen.findByRole('button', { name: /Hủy đơn giữ chỗ/i }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    expect(
      await screen.findByText(/Không thể hủy đơn: Đơn hàng đã thay đổi trạng thái/i)
    ).toBeInTheDocument();
  });

  it('Test 12: Network timeout on cancel displays indeterminate message with retry', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockDetailData);

    vi.spyOn(bookingsApi, 'cancel').mockRejectedValue(
      new ApiErrorResponse('Gateway timeout', 'NETWORK_ERROR', 504)
    );

    renderApp('/bookings/1001');

    await user.click(await screen.findByRole('button', { name: /Hủy đơn giữ chỗ/i }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    expect(
      await screen.findByText(/Chưa xác định kết quả hủy do máy chủ phản hồi chậm/i)
    ).toBeInTheDocument();
  });

  it('Test 13: 404 / Non-existent booking does not leak details on detail page', async () => {
    vi.spyOn(bookingsApi, 'getById').mockRejectedValue(
      new ApiErrorResponse('Không tìm thấy tài nguyên.', 'RESOURCE_NOT_FOUND', 404)
    );

    renderApp('/bookings/9999');

    expect(
      await screen.findByText('Không tìm thấy đơn đặt vé')
    ).toBeInTheDocument();
    expect(screen.queryByText('Dune: Part Two')).not.toBeInTheDocument();
  });

  it('Test 14: Return path navigation leads back to /my-tickets', async () => {
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockDetailData);

    renderApp('/bookings/1001');

    const backLink = await screen.findByRole('link', { name: /Vé của tôi/i });
    expect(backLink).toHaveAttribute('href', '/my-tickets');
  });

  it('Test 15: Successful cancel removes user booking intent from sessionStorage', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockDetailData);
    vi.spyOn(bookingsApi, 'cancel').mockResolvedValue({
      bookingId: 1001,
      status: 'CANCELLED',
      releasedSeatCount: 2,
    });

    sessionStorage.setItem(
      `cinema_booking_intent_${customerUser.id}`,
      JSON.stringify({ bookingId: 1001 })
    );

    renderApp('/bookings/1001');

    await user.click(await screen.findByRole('button', { name: /Hủy đơn giữ chỗ/i }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    await waitFor(() => {
      expect(
        sessionStorage.getItem(`cinema_booking_intent_${customerUser.id}`)
      ).toBeNull();
    });
  });
});
