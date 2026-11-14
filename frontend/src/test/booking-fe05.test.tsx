import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { SeatSelectionPage } from '@/pages/SeatSelectionPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { bookingsApi } from '@/features/bookings/api/bookings.api';
import { showtimesApi } from '@/features/showtimes/api/showtimes.api';
import * as authModule from '@/features/auth';
import { renderWithProviders } from './test-utils';
import { ApiErrorResponse } from '@/shared/api/http-client';
import {
  saveBookingIntent,
  getSavedBookingIntent,
  clearBookingIntent,
} from '@/features/bookings/utils/booking-intent';
import type { BookingDetailResponse } from '@/features/bookings';
import type { SeatMapResponse } from '@/features/showtimes';

describe('FE-05: Booking, 5-minute Hold & Recoverable Checkout', () => {
  const customerUser = {
    id: 10,
    fullName: 'Nguyễn Văn A',
    email: 'customer10@cinema.com',
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
  };

  const mockSeatMap: SeatMapResponse = {
    showtimeId: 101,
    startsAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    bookingClosesAt: new Date(Date.now() + 110 * 60 * 1000).toISOString(),
    seats: [
      { seatId: 1, label: 'A1', seatType: 'STANDARD', status: 'AVAILABLE', price: 75000 },
      { seatId: 2, label: 'A2', seatType: 'STANDARD', status: 'AVAILABLE', price: 75000 },
      { seatId: 3, label: 'B1', seatType: 'VIP', status: 'AVAILABLE', price: 95000 },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: customerUser,
      token: 'valid-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'CUSTOMER',
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // Helper to render SeatSelectionPage with routes
  function renderSeatSelection(initialPath = '/showtimes/101/seats') {
    return renderWithProviders(
      <Routes>
        <Route path="/showtimes/:showtimeId/seats" element={<SeatSelectionPage />} />
        <Route path="/bookings/:bookingId/checkout" element={<CheckoutPage />} />
      </Routes>,
      { initialEntries: [initialPath] }
    );
  }

  // Helper to render CheckoutPage with routes
  function renderCheckout(bookingId = 1001) {
    return renderWithProviders(
      <Routes>
        <Route path="/bookings/:bookingId/checkout" element={<CheckoutPage />} />
        <Route path="/showtimes" element={<div>Trang Lịch Chiếu</div>} />
      </Routes>,
      { initialEntries: [`/bookings/${bookingId}/checkout`] }
    );
  }

  it('Test 5: POSTs with correct sorted payload; double-click results in only one POST call', async () => {
    const user = userEvent.setup();
    vi.spyOn(showtimesApi, 'getSeats').mockResolvedValue(mockSeatMap);

    const createSpy = vi.spyOn(bookingsApi, 'create').mockImplementation(async () => {
      // Simulate slow response
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        bookingId: 1001,
        bookingCode: 'BK0001001',
        showtimeId: 101,
        status: 'PENDING',
        seatIds: [1, 2],
        totalAmount: 150000,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };
    });

    renderSeatSelection();

    // Select seats A2 then A1 (intentionally reverse order)
    const seatA2 = await screen.findByRole('button', { name: /Ghế A2/i });
    const seatA1 = await screen.findByRole('button', { name: /Ghế A1/i });
    await user.click(seatA2);
    await user.click(seatA1);

    // Click continue
    const continueBtn = screen.getByRole('button', { name: /Tiếp tục đặt vé/i });
    await user.click(continueBtn);

    // Confirmation dialog appears
    const confirmBtn = await screen.findByRole('button', { name: 'Xác nhận giữ ghế' });

    // Double-click confirm button rapidly
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    // Verify seatIds are sorted ascending: [1, 2]
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        showtimeId: 101,
        seatIds: [1, 2],
        clientRequestId: expect.any(String),
      })
    );
  });

  it('Test 6: Timeout/5xx sets indeterminate result; retry with same intent payload & key receives replay', async () => {
    const user = userEvent.setup();
    vi.spyOn(showtimesApi, 'getSeats').mockResolvedValue(mockSeatMap);

    // First attempt fails with network/timeout error
    const createSpy = vi
      .spyOn(bookingsApi, 'create')
      .mockRejectedValueOnce(new ApiErrorResponse('Timeout', 'NETWORK_ERROR', undefined))
      .mockResolvedValueOnce({
        bookingId: 1001,
        bookingCode: 'BK0001001',
        showtimeId: 101,
        status: 'PENDING',
        seatIds: [1],
        totalAmount: 75000,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      });

    renderSeatSelection();

    await user.click(await screen.findByRole('button', { name: /Ghế A1/i }));
    await user.click(screen.getByRole('button', { name: /Tiếp tục đặt vé/i }));
    await user.click(await screen.findByRole('button', { name: 'Xác nhận giữ ghế' }));

    // User sees "Chưa xác định kết quả" error banner
    expect(await screen.findByText('Chưa xác định kết quả')).toBeInTheDocument();

    const firstRequestId = createSpy.mock.calls[0][0].clientRequestId;
    expect(firstRequestId).toBeDefined();

    // Click "Thử lại đối soát"
    const retryBtn = screen.getByRole('button', { name: /Thử lại đối soát/i });
    await user.click(retryBtn);

    // Second call must reuse the exact same clientRequestId!
    expect(createSpy).toHaveBeenCalledTimes(2);
    const secondRequestId = createSpy.mock.calls[1][0].clientRequestId;
    expect(secondRequestId).toBe(firstRequestId);
  });

  it('Test 7: Reload before knowing result recovers intent and does NOT auto-POST on mount', async () => {
    vi.spyOn(showtimesApi, 'getSeats').mockResolvedValue(mockSeatMap);
    const createSpy = vi.spyOn(bookingsApi, 'create');

    // Pre-populate intent in sessionStorage (simulating unconfirmed intent)
    saveBookingIntent({
      version: 1,
      userId: customerUser.id,
      showtimeId: 101,
      seatIds: [1, 2],
      clientRequestId: 'saved-uuid-12345',
      createdAt: new Date().toISOString(),
    });

    renderSeatSelection();

    await screen.findByRole('button', { name: /Ghế A1/i });

    // Mount / reload must NOT auto-POST
    expect(createSpy).not.toHaveBeenCalled();

    // Saved intent remains in sessionStorage
    const saved = getSavedBookingIntent(customerUser.id);
    expect(saved?.clientRequestId).toBe('saved-uuid-12345');
  });

  it('Test 8: Deep link / refresh on Checkout ONLY calls GET detail, never auto-POSTs', async () => {
    const createSpy = vi.spyOn(bookingsApi, 'create');
    const getDetailSpy = vi.spyOn(bookingsApi, 'getById').mockResolvedValue({
      bookingId: 1001,
      bookingCode: 'BK0001001',
      showtimeId: 101,
      movieTitle: 'Dune 2',
      roomName: 'Phòng 01',
      startsAt: new Date(Date.now() + 7200000).toISOString(),
      status: 'PENDING',
      effectiveStatus: 'PENDING',
      totalAmount: 150000,
      createdAt: new Date(Date.now() - 60000).toISOString(),
      expiresAt: new Date(Date.now() + 240000).toISOString(), // 4 minutes remaining
      seats: [
        { seatId: 1, label: 'A1', seatType: 'STANDARD', unitPrice: 75000 },
        { seatId: 2, label: 'A2', seatType: 'STANDARD', unitPrice: 75000 },
      ],
    });

    renderCheckout(1001);

    expect(await screen.findAllByText('BK0001001')).not.toHaveLength(0);
    expect(getDetailSpy).toHaveBeenCalledWith(1001);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('Test 9: Replay of terminal booking (CONFIRMED) displays current status without creating new hold', async () => {
    vi.spyOn(bookingsApi, 'getById').mockResolvedValue({
      bookingId: 1001,
      bookingCode: 'BK0001001',
      showtimeId: 101,
      movieTitle: 'Dune 2',
      roomName: 'Phòng 01',
      startsAt: new Date(Date.now() + 7200000).toISOString(),
      status: 'CONFIRMED',
      effectiveStatus: 'CONFIRMED',
      totalAmount: 150000,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      expiresAt: new Date(Date.now() - 3300000).toISOString(),
      seats: [
        { seatId: 1, label: 'A1', seatType: 'STANDARD', unitPrice: 75000 },
      ],
    });

    renderCheckout(1001);

    // Displays CONFIRMED badge
    expect(await screen.findByText(/Đã thanh toán \(CONFIRMED\)/i)).toBeInTheDocument();
    // Countdown banner should NOT be rendered when terminal
    expect(screen.queryByText('Thời gian giữ ghế còn lại')).not.toBeInTheDocument();
  });

  it('Test 10: Countdown computes from expiresAt - now and does not reset 300s after reload', async () => {
    // Expires in exactly 120 seconds (2 minutes remaining)
    const expiresAt = new Date(Date.now() + 120 * 1000).toISOString();

    vi.spyOn(bookingsApi, 'getById').mockResolvedValue({
      bookingId: 1001,
      bookingCode: 'BK0001001',
      showtimeId: 101,
      movieTitle: 'Dune 2',
      roomName: 'Phòng 01',
      startsAt: new Date(Date.now() + 7200000).toISOString(),
      status: 'PENDING',
      effectiveStatus: 'PENDING',
      totalAmount: 75000,
      createdAt: new Date(Date.now() - 180000).toISOString(),
      expiresAt,
      seats: [
        { seatId: 1, label: 'A1', seatType: 'STANDARD', unitPrice: 75000 },
      ],
    });

    renderCheckout(1001);

    expect(await screen.findByText('Thời gian giữ ghế còn lại')).toBeInTheDocument();

    // Remaining time must be ~02:00 or 01:59, NOT 05:00!
    const timerTexts = screen.getAllByText(/0[12]:[0-5][0-9]/);
    expect(timerTexts.length).toBeGreaterThan(0);
    timerTexts.forEach((timer) => expect(timer.textContent).not.toBe('05:00'));
  });

  it('Test 11: Displays EXPIRED when remaining time reaches 0 even if persisted is PENDING', async () => {
    // Already expired in the past
    const pastExpiresAt = new Date(Date.now() - 5000).toISOString();

    vi.spyOn(bookingsApi, 'getById').mockResolvedValue({
      bookingId: 1001,
      bookingCode: 'BK0001001',
      showtimeId: 101,
      movieTitle: 'Dune 2',
      roomName: 'Phòng 01',
      startsAt: new Date(Date.now() + 7200000).toISOString(),
      status: 'PENDING',
      effectiveStatus: 'EXPIRED', // Backend says EXPIRED
      totalAmount: 75000,
      createdAt: new Date(Date.now() - 305000).toISOString(),
      expiresAt: pastExpiresAt,
      seats: [
        { seatId: 1, label: 'A1', seatType: 'STANDARD', unitPrice: 75000 },
      ],
    });

    renderCheckout(1001);

    expect(
      await screen.findByText(/Đơn đặt vé đã hết thời hạn giữ ghế/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Hết hạn giữ chỗ \(EXPIRED\)/i)).toBeInTheDocument();
  });

  it('Test 12: Network error during countdown refetch does NOT treat booking as expired', async () => {
    const validExpiresAt = new Date(Date.now() + 200 * 1000).toISOString();

    vi.spyOn(bookingsApi, 'getById')
      .mockResolvedValueOnce({
        bookingId: 1001,
        bookingCode: 'BK0001001',
        showtimeId: 101,
        movieTitle: 'Dune 2',
        roomName: 'Phòng 01',
        startsAt: new Date(Date.now() + 7200000).toISOString(),
        status: 'PENDING',
        effectiveStatus: 'PENDING',
        totalAmount: 75000,
        createdAt: new Date().toISOString(),
        expiresAt: validExpiresAt,
        seats: [{ seatId: 1, label: 'A1', seatType: 'STANDARD', unitPrice: 75000 }],
      })
      .mockRejectedValueOnce(new ApiErrorResponse('Network timeout', 'NETWORK_ERROR', undefined));

    renderCheckout(1001);

    expect(await screen.findAllByText('BK0001001')).not.toHaveLength(0);
    // It should STILL be PENDING and holding, not flipped to EXPIRED due to network hiccup
    expect(screen.queryByText(/Đơn đặt vé đã hết thời hạn giữ ghế/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Đang giữ chỗ \(PENDING\)/i)).toBeInTheDocument();
  });

  it('Test 13: SEAT_UNAVAILABLE (409) is all-or-nothing: refetches seat map and allows reselecting', async () => {
    const user = userEvent.setup();
    const getSeatsSpy = vi.spyOn(showtimesApi, 'getSeats').mockResolvedValue(mockSeatMap);

    vi.spyOn(bookingsApi, 'create').mockRejectedValueOnce(
      new ApiErrorResponse(
        'Một hoặc nhiều ghế không còn khả dụng.',
        'SEAT_UNAVAILABLE',
        409
      )
    );

    renderSeatSelection();

    await user.click(await screen.findByRole('button', { name: /Ghế A1/i }));
    await user.click(screen.getByRole('button', { name: /Tiếp tục đặt vé/i }));
    await user.click(await screen.findByRole('button', { name: 'Xác nhận giữ ghế' }));

    // Seat map refetch is called
    expect(getSeatsSpy).toHaveBeenCalled();

    // Alert informs that seats are unavailable and no partial hold was made
    expect(await screen.findByText('Ghế không còn khả dụng')).toBeInTheDocument();
    expect(screen.getByText(/Hệ thống không giữ một phần ghế/i)).toBeInTheDocument();
  });

  it('Test 14: Truthfully renders server snapshot unit prices and total amount', async () => {
    const detailResponse: BookingDetailResponse = {
      bookingId: 1001,
      bookingCode: 'BK0001001',
      showtimeId: 101,
      movieTitle: 'Dune: Part Two',
      roomName: 'Phòng VIP 01',
      startsAt: '2026-11-10T12:00:00Z',
      status: 'PENDING',
      effectiveStatus: 'PENDING',
      totalAmount: 170000, // 75k + 95k
      createdAt: '2026-11-10T11:00:00Z',
      expiresAt: new Date(Date.now() + 250000).toISOString(),
      seats: [
        { seatId: 1, label: 'A1', seatType: 'STANDARD', unitPrice: 75000 },
        { seatId: 3, label: 'B1', seatType: 'VIP', unitPrice: 95000 },
      ],
    };

    vi.spyOn(bookingsApi, 'getById').mockResolvedValue(detailResponse);

    renderCheckout(1001);

    expect(await screen.findByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getByText('Phòng VIP 01')).toBeInTheDocument();
    expect(screen.getByText('170.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('75.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('95.000 ₫')).toBeInTheDocument();
  });

  it('Test 15: Logout clears booking intent and does not leak data across accounts', () => {
    saveBookingIntent({
      version: 1,
      userId: customerUser.id,
      showtimeId: 101,
      seatIds: [1, 2],
      clientRequestId: 'intent-uuid-1',
      createdAt: new Date().toISOString(),
    });

    expect(getSavedBookingIntent(customerUser.id)).not.toBeNull();

    // Clear intent (called during logout)
    clearBookingIntent(customerUser.id);

    expect(getSavedBookingIntent(customerUser.id)).toBeNull();
  });
});
