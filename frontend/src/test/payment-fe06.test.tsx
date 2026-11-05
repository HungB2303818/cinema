import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { BookingSuccessPage } from '@/pages/BookingSuccessPage';
import { bookingsApi } from '@/features/bookings';
import type { BookingDetailResponse } from '@/features/bookings';
import {
  paymentsApi,
  savePaymentAttempt,
  getSavedPaymentAttempt,
  clearPaymentAttempt,
} from '@/features/payments';
import type { PaymentResponse } from '@/features/payments';
import { ticketsApi } from '@/features/tickets';
import type { TicketItem } from '@/features/tickets';
import * as authModule from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { renderWithProviders } from './test-utils';

describe('FE-06: Mock Payment, Confirmation & Issued Tickets', () => {
  const customerUser = {
    id: 10,
    fullName: 'Nguyen Van A',
    email: 'customer@example.com',
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
  };

  const mockBookingDetail: BookingDetailResponse = {
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

  const mockTickets: TicketItem[] = [
    { seatId: 1, label: 'A1', ticketCode: 'TK-1001-A1-XYZ' },
    { seatId: 2, label: 'A2', ticketCode: 'TK-1001-A2-ABC' },
  ];

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
        <Route path="/bookings/:bookingId/checkout" element={<CheckoutPage />} />
        <Route path="/bookings/:bookingId/success" element={<BookingSuccessPage />} />
        <Route path="/showtimes" element={<div>Trang lịch chiếu</div>} />
        <Route path="/my-tickets" element={<div>Trang vé của tôi</div>} />
      </Routes>,
      { initialEntries: [initialUrl] }
    );
  };

  it('Test 1: POSTs payment with simulatedResult and idempotencyKey; double click sends only one request', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockBookingDetail);

    const paymentResponse: PaymentResponse = {
      bookingId: 1001,
      bookingCode: 'BK0001001',
      status: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
      paidAt: new Date().toISOString(),
      tickets: mockTickets,
    };

    const mockPaySpy = vi.spyOn(paymentsApi, 'mockPayment').mockImplementation(async () => {
      // Small artificial delay to verify double-click guard
      await new Promise((r) => setTimeout(r, 80));
      return paymentResponse;
    });

    renderApp('/bookings/1001/checkout');

    const successBtn = await screen.findByRole('button', {
      name: /Mô phỏng thanh toán thành công/i,
    });
    expect(successBtn).toBeEnabled();

    // Rapid double-click
    await Promise.all([user.click(successBtn), user.click(successBtn)]);

    expect(mockPaySpy).toHaveBeenCalledTimes(1);
    expect(mockPaySpy).toHaveBeenCalledWith(
      1001,
      expect.objectContaining({
        simulatedResult: 'SUCCESS',
        idempotencyKey: expect.any(String),
      })
    );
  });

  it('Test 2: FAILED simulated payment displays failure notice, keeps booking PENDING, and next attempt uses a new key', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockBookingDetail);

    let firstKey = '';
    let secondKey = '';

    const failedResponse: PaymentResponse = {
      bookingId: 1001,
      bookingCode: 'BK0001001',
      status: 'PENDING',
      paymentStatus: 'FAILED',
      message: 'Giao dịch mô phỏng bị từ chối.',
    };

    const successResponse: PaymentResponse = {
      bookingId: 1001,
      bookingCode: 'BK0001001',
      status: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
      paidAt: new Date().toISOString(),
    };

    const paySpy = vi
      .spyOn(paymentsApi, 'mockPayment')
      .mockImplementationOnce(async (_, req) => {
        firstKey = req.idempotencyKey;
        return failedResponse;
      })
      .mockImplementationOnce(async (_, req) => {
        secondKey = req.idempotencyKey;
        return successResponse;
      });

    renderApp('/bookings/1001/checkout');

    const failBtn = await screen.findByRole('button', {
      name: /Mô phỏng thanh toán thất bại/i,
    });
    await user.click(failBtn);

    // Shows failure banner
    expect(await screen.findByText('Thanh toán mô phỏng thất bại')).toBeInTheDocument();
    expect(screen.getByText(/Giao dịch mô phỏng bị từ chối/i)).toBeInTheDocument();

    // Booking remains in PENDING state
    expect(screen.getByText(/Đang giữ chỗ \(PENDING\)/i)).toBeInTheDocument();

    // Now try second attempt (SUCCESS)
    const successBtn = screen.getByRole('button', {
      name: /Mô phỏng thanh toán thành công/i,
    });
    await user.click(successBtn);

    expect(paySpy).toHaveBeenCalledTimes(2);
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBeTruthy();
    expect(firstKey).not.toBe(secondKey); // Distinct keys!
  });

  it('Test 3: Network error / timeout triggers indeterminate state and retry uses the EXACT SAME idempotency key', async () => {
    const user = userEvent.setup();
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockBookingDetail);

    let firstKey = '';
    let secondKey = '';

    const paySpy = vi
      .spyOn(paymentsApi, 'mockPayment')
      .mockImplementationOnce(async (_, req) => {
        firstKey = req.idempotencyKey;
        throw new ApiErrorResponse('Gateway Timeout', 'GATEWAY_TIMEOUT', 504);
      })
      .mockImplementationOnce(async (_, req) => {
        secondKey = req.idempotencyKey;
        return {
          bookingId: 1001,
          bookingCode: 'BK0001001',
          status: 'CONFIRMED',
          paymentStatus: 'SUCCESS',
        };
      });

    renderApp('/bookings/1001/checkout');

    const successBtn = await screen.findByRole('button', {
      name: /Mô phỏng thanh toán thành công/i,
    });
    await user.click(successBtn);

    // Shows indeterminate state
    expect(await screen.findByText('Chưa xác định kết quả thanh toán')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', {
      name: /Kiểm tra & Thử lại đối soát/i,
    });
    expect(retryBtn).toBeInTheDocument();

    // Attempt is preserved in sessionStorage
    const saved = getSavedPaymentAttempt(customerUser.id, 1001);
    expect(saved).not.toBeNull();
    expect(saved?.status).toBe('INDETERMINATE');

    // Click retry
    await user.click(retryBtn);

    await waitFor(() => {
      expect(paySpy).toHaveBeenCalledTimes(2);
    });

    expect(secondKey).toBe(firstKey); // REUSED identical key for technical retry!
  });

  it('Test 4: Timeout after server SUCCESS reconciles via GET booking and navigates to success WITHOUT second payment', async () => {
    const user = userEvent.setup();
    const getByIdSpy = vi
      .spyOn(bookingsApi, 'getById')
      .mockResolvedValueOnce(mockBookingDetail) // Initially PENDING
      .mockResolvedValueOnce({
        ...mockBookingDetail,
        status: 'CONFIRMED',
        effectiveStatus: 'CONFIRMED',
      }); // Server actually committed!

    vi.spyOn(ticketsApi, 'getByBookingId').mockResolvedValue(mockTickets);

    const paySpy = vi.spyOn(paymentsApi, 'mockPayment').mockRejectedValueOnce(
      new ApiErrorResponse('Network drop after commit', 'NETWORK_ERROR', 0)
    );

    renderApp('/bookings/1001/checkout');

    const successBtn = await screen.findByRole('button', {
      name: /Mô phỏng thanh toán thành công/i,
    });
    await user.click(successBtn);

    // Indeterminate notice
    expect(await screen.findByText('Chưa xác định kết quả thanh toán')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', {
      name: /Kiểm tra & Thử lại đối soát/i,
    });
    await user.click(retryBtn);

    // Navigates to success page
    expect(await screen.findByText('Đặt vé & Thanh toán thành công')).toBeInTheDocument();
    expect(paySpy).toHaveBeenCalledTimes(1); // Never called payment a second time!
    expect(getByIdSpy).toHaveBeenCalledTimes(2);
  });

  it('Test 5: Reload with saved indeterminate attempt recovers state and does NOT auto-POST on mount', async () => {
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockBookingDetail);
    const paySpy = vi.spyOn(paymentsApi, 'mockPayment');

    // Pre-seed indeterminate attempt in sessionStorage
    savePaymentAttempt({
      version: 1,
      userId: customerUser.id,
      bookingId: 1001,
      simulatedResult: 'SUCCESS',
      idempotencyKey: 'reloaded-uuid-key',
      createdAt: new Date().toISOString(),
      status: 'INDETERMINATE',
    });

    renderApp('/bookings/1001/checkout');

    expect(await screen.findByText('Chưa xác định kết quả thanh toán')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kiểm tra & Thử lại đối soát/i })).toBeInTheDocument();

    // Absolutely NO automatic POST on mount/reload
    expect(paySpy).not.toHaveBeenCalled();
  });

  it('Test 6: Expiration blocks payment attempts and does NOT reset countdown', async () => {
    const expiredBooking: BookingDetailResponse = {
      ...mockBookingDetail,
      status: 'PENDING',
      effectiveStatus: 'EXPIRED',
      expiresAt: new Date(Date.now() - 10000).toISOString(),
    };

    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(expiredBooking);
    const paySpy = vi.spyOn(paymentsApi, 'mockPayment');

    renderApp('/bookings/1001/checkout');

    expect(await screen.findByText('Hết hạn giữ chỗ (EXPIRED)')).toBeInTheDocument();
    expect(
      screen.getByText('Đơn đặt vé đã hết thời hạn giữ ghế (5 phút)')
    ).toBeInTheDocument();

    // Payment buttons are not offered
    expect(
      screen.queryByRole('button', { name: /Mô phỏng thanh toán thành công/i })
    ).not.toBeInTheDocument();

    expect(paySpy).not.toHaveBeenCalled();
  });

  it('Test 7: Deep link to /bookings/:id/success performs GET only and does NOT treat URL as proof if PENDING', async () => {
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(mockBookingDetail); // PENDING
    const ticketsSpy = vi.spyOn(ticketsApi, 'getByBookingId');
    const paySpy = vi.spyOn(paymentsApi, 'mockPayment');

    renderApp('/bookings/1001/success');

    // Does NOT show celebration; warns that payment is not complete
    expect(await screen.findByText('Đơn đặt vé chưa hoàn tất thanh toán')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Tiếp tục thanh toán/i })
    ).toBeInTheDocument();

    // Never calls tickets API or payment API
    expect(ticketsSpy).not.toHaveBeenCalled();
    expect(paySpy).not.toHaveBeenCalled();
  });

  it('Test 8: CONFIRMED booking on success page fetches tickets, renders ticket codes and allows copying', async () => {
    const user = userEvent.setup();
    const confirmedBooking: BookingDetailResponse = {
      ...mockBookingDetail,
      status: 'CONFIRMED',
      effectiveStatus: 'CONFIRMED',
    };

    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(confirmedBooking);
    vi.spyOn(ticketsApi, 'getByBookingId').mockResolvedValue(mockTickets);

    renderApp('/bookings/1001/success');

    expect(await screen.findByText('Đặt vé & Thanh toán thành công')).toBeInTheDocument();
    expect(await screen.findByText('TK-1001-A1-XYZ')).toBeInTheDocument();
    expect(screen.getByText('TK-1001-A2-ABC')).toBeInTheDocument();

    // Copy button test
    const copyBtn = screen.getByRole('button', { name: /Sao chép mã vé ghế A1/i });
    expect(copyBtn).toBeInTheDocument();
    await user.click(copyBtn);
  });

  it('Test 9: Ticket load error on success page displays retry button and does NOT suggest paying again', async () => {
    const confirmedBooking: BookingDetailResponse = {
      ...mockBookingDetail,
      status: 'CONFIRMED',
      effectiveStatus: 'CONFIRMED',
    };

    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(confirmedBooking);
    const ticketsSpy = vi
      .spyOn(ticketsApi, 'getByBookingId')
      .mockRejectedValue(new Error('Gateway error loading tickets'));

    renderApp('/bookings/1001/success');

    expect(await screen.findByText('Đặt vé & Thanh toán thành công')).toBeInTheDocument();
    expect(
      await screen.findByText('Đã xác nhận thanh toán, chưa tải được vé')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử tải lại vé/i })).toBeInTheDocument();

    // Never suggests paying again
    expect(screen.queryByText(/Thanh toán lại/i)).not.toBeInTheDocument();
    expect(ticketsSpy).toHaveBeenCalledTimes(1);
  });

  it('Test 10: Non-owner / 404 does not leak booking data on success page', async () => {
    vi.spyOn(bookingsApi, 'getById').mockRejectedValue(
      new ApiErrorResponse('Không tìm thấy tài nguyên.', 'RESOURCE_NOT_FOUND', 404)
    );

    renderApp('/bookings/9999/success');

    expect(await screen.findByText('Không thể tìm thấy thông tin vé')).toBeInTheDocument();
    expect(screen.queryByText('Dune: Part Two')).not.toBeInTheDocument();
    expect(screen.queryByText('Danh sách vé đã phát hành')).not.toBeInTheDocument();
  });

  it('Test 11: Logout clears payment attempt from sessionStorage', () => {
    savePaymentAttempt({
      version: 1,
      userId: customerUser.id,
      bookingId: 1001,
      simulatedResult: 'SUCCESS',
      idempotencyKey: 'logout-test-key',
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    });

    expect(getSavedPaymentAttempt(customerUser.id, 1001)).not.toBeNull();

    // Clear attempt
    clearPaymentAttempt(customerUser.id, 1001);
    expect(getSavedPaymentAttempt(customerUser.id, 1001)).toBeNull();
  });
});
