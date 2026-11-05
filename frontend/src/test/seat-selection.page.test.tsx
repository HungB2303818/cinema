import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { SeatSelectionPage } from '@/pages/SeatSelectionPage';
import { showtimesApi } from '@/features/showtimes/api/showtimes.api';
import type { SeatMapResponse } from '@/features/showtimes';
import * as authModule from '@/features/auth';
import { renderWithProviders } from './test-utils';

vi.mock('@/features/showtimes/api/showtimes.api', () => ({
  showtimesApi: {
    getSeats: vi.fn(),
  },
}));

describe('SeatSelectionPage (FE-04)', () => {
  const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const futureCutoff = new Date(Date.now() + 110 * 60 * 1000).toISOString();

  const mockSeatMapData: SeatMapResponse = {
    showtimeId: 101,
    startsAt: futureDate,
    bookingClosesAt: futureCutoff,
    seats: [
      { seatId: 1, label: 'A1', seatType: 'STANDARD', status: 'AVAILABLE', price: 90000 },
      { seatId: 2, label: 'A2', seatType: 'STANDARD', status: 'AVAILABLE', price: 90000 },
      { seatId: 3, label: 'A3', seatType: 'STANDARD', status: 'HELD', price: 90000 },
      { seatId: 4, label: 'A4', seatType: 'STANDARD', status: 'BOOKED', price: 90000 },
      { seatId: 5, label: 'B1', seatType: 'VIP', status: 'AVAILABLE', price: 110000 },
      { seatId: 6, label: 'B2', seatType: 'VIP', status: 'AVAILABLE', price: 110000 },
      { seatId: 7, label: 'B3', seatType: 'VIP', status: 'AVAILABLE', price: 110000 },
      { seatId: 8, label: 'B4', seatType: 'VIP', status: 'AVAILABLE', price: 110000 },
      { seatId: 9, label: 'B5', seatType: 'VIP', status: 'AVAILABLE', price: 110000 },
      { seatId: 10, label: 'B6', seatType: 'VIP', status: 'AVAILABLE', price: 110000 },
      { seatId: 11, label: 'B7', seatType: 'VIP', status: 'AVAILABLE', price: 110000 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: () => false,
    });
  });

  const renderSeatPage = (initialUrl = '/showtimes/101/seats') => {
    return renderWithProviders(
      <Routes>
        <Route path="/showtimes/:showtimeId/seats" element={<SeatSelectionPage />} />
        <Route path="/showtimes" element={<div>Trang lịch chiếu</div>} />
        <Route path="/login" element={<div>Trang đăng nhập</div>} />
      </Routes>,
      { initialEntries: [initialUrl] }
    );
  };

  it('renders invalid showtime ID error when param is not numeric', async () => {
    renderSeatPage('/showtimes/invalid-id/seats');

    expect(screen.getByText('Mã suất chiếu không hợp lệ')).toBeInTheDocument();
    expect(screen.queryByText('Màn hình / Screen')).not.toBeInTheDocument();
  });

  it('renders loading spinner and loads seat map data from backend contract', async () => {
    vi.mocked(showtimesApi.getSeats).mockResolvedValue(mockSeatMapData);

    renderSeatPage('/showtimes/101/seats');

    expect(screen.getByText('Đang tải sơ đồ ghế suất chiếu...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Màn hình / Screen')).toBeInTheDocument();
    });

    expect(showtimesApi.getSeats).toHaveBeenCalledWith(101);
    expect(screen.getByRole('button', { name: /Ghế A1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ghế B1/i })).toBeInTheDocument();
    expect(screen.getByText('Mã suất #101')).toBeInTheDocument();
    expect(screen.getByText('Đang nhận đặt vé trực tuyến')).toBeInTheDocument();
  });

  it('disables HELD and BOOKED seats from selection', async () => {
    vi.mocked(showtimesApi.getSeats).mockResolvedValue(mockSeatMapData);
    renderSeatPage('/showtimes/101/seats');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ghế A1/i })).toBeInTheDocument();
    });

    // A3 is HELD, A4 is BOOKED
    const a3Button = screen.getByRole('button', { name: /Ghế A3/i });
    const a4Button = screen.getByRole('button', { name: /Ghế A4/i });

    expect(a3Button).toBeDisabled();
    expect(a4Button).toBeDisabled();
    expect(a3Button).toHaveAttribute('aria-label', expect.stringContaining('Đang giữ chỗ'));
    expect(a4Button).toHaveAttribute('aria-label', expect.stringContaining('Đã bán'));
  });

  it('allows selecting available seats, updating summary, and removing seats', async () => {
    const user = userEvent.setup();
    vi.mocked(showtimesApi.getSeats).mockResolvedValue(mockSeatMapData);

    renderSeatPage('/showtimes/101/seats');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ghế A1/i })).toBeInTheDocument();
    });

    // Initially 0 seats selected
    expect(screen.getByText('Ghế đã chọn (0/8)')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có ghế nào được chọn/i)).toBeInTheDocument();

    // Select seat A1 (STANDARD, 90,000 đ)
    const a1Button = screen.getByRole('button', { name: /Ghế A1/i });
    await user.click(a1Button);

    expect(screen.getByText('Ghế đã chọn (1/8)')).toBeInTheDocument();
    expect(screen.getAllByText('90.000 ₫').length).toBeGreaterThan(0);

    // Select seat B1 (VIP, 110,000 đ)
    const b1Button = screen.getByRole('button', { name: /Ghế B1/i });
    await user.click(b1Button);

    expect(screen.getByText('Ghế đã chọn (2/8)')).toBeInTheDocument();
    // Total: 90k + 110k = 200,000 ₫
    expect(screen.getByText('200.000 ₫')).toBeInTheDocument();

    // Deselect B1 by clicking it again
    await user.click(b1Button);
    expect(screen.getByText('Ghế đã chọn (1/8)')).toBeInTheDocument();
    expect(screen.getAllByText('90.000 ₫').length).toBeGreaterThan(0);

    // Deselect A1 via remove button in summary
    const removeA1 = screen.getByRole('button', { name: /Bỏ chọn ghế A1/i });
    await user.click(removeA1);
    expect(screen.getByText('Ghế đã chọn (0/8)')).toBeInTheDocument();
  });

  it('enforces maximum 8 seats limit and displays Vietnamese warning', async () => {
    const user = userEvent.setup();
    vi.mocked(showtimesApi.getSeats).mockResolvedValue(mockSeatMapData);

    renderSeatPage('/showtimes/101/seats');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ghế A1/i })).toBeInTheDocument();
    });

    // Select 8 available seats: A1, A2, B1, B2, B3, B4, B5, B6
    const seatButtons = [
      screen.getByRole('button', { name: /Ghế A1/i }),
      screen.getByRole('button', { name: /Ghế A2/i }),
      screen.getByRole('button', { name: /Ghế B1/i }),
      screen.getByRole('button', { name: /Ghế B2/i }),
      screen.getByRole('button', { name: /Ghế B3/i }),
      screen.getByRole('button', { name: /Ghế B4/i }),
      screen.getByRole('button', { name: /Ghế B5/i }),
      screen.getByRole('button', { name: /Ghế B6/i }),
    ];

    for (const btn of seatButtons) {
      await user.click(btn);
    }

    expect(screen.getByText('Ghế đã chọn (8/8)')).toBeInTheDocument();

    // Attempting to select 9th seat (B7)
    const b7Button = screen.getByRole('button', { name: /Ghế B7/i });
    expect(b7Button).toBeDisabled();
    await user.click(b7Button);

    expect(screen.getByText('Ghế đã chọn (8/8)')).toBeInTheDocument();
  });

  it('redirects unauthenticated guest to login page with return state', async () => {
    const user = userEvent.setup();
    vi.mocked(showtimesApi.getSeats).mockResolvedValue(mockSeatMapData);

    renderSeatPage('/showtimes/101/seats');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ghế A1/i })).toBeInTheDocument();
    });

    // Select A1
    await user.click(screen.getByRole('button', { name: /Ghế A1/i }));

    const continueBtn = screen.getByRole('button', { name: /Đăng nhập để tiếp tục/i });
    expect(continueBtn).toBeEnabled();

    await user.click(continueBtn);

    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument();
  });

  it('blocks STAFF/ADMIN users and displays warning', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 2, fullName: 'Staff User', email: 'staff@example.com', role: 'STAFF', status: 'ACTIVE' },
      token: 'fake-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'STAFF',
    });

    const user = userEvent.setup();
    vi.mocked(showtimesApi.getSeats).mockResolvedValue(mockSeatMapData);

    renderSeatPage('/showtimes/101/seats');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ghế A1/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Ghế A1/i }));

    expect(
      screen.getByText(/Tài khoản STAFF không thể đặt vé khách hàng/i)
    ).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /Tiếp tục đặt vé/i });
    expect(continueBtn).toBeDisabled();
  });

  it('shows FE-05 boundary modal when logged-in CUSTOMER clicks continue', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 3, fullName: 'Customer One', email: 'cust@example.com', role: 'CUSTOMER', status: 'ACTIVE' },
      token: 'fake-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'CUSTOMER',
    });

    const user = userEvent.setup();
    vi.mocked(showtimesApi.getSeats).mockResolvedValue(mockSeatMapData);

    renderSeatPage('/showtimes/101/seats');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ghế A1/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Ghế A1/i }));

    const continueBtn = screen.getByRole('button', { name: /Tiếp tục đặt vé/i });
    expect(continueBtn).toBeEnabled();

    await user.click(continueBtn);

    // FE-05 boundary confirmation dialog should appear
    expect(screen.getByText('Đã chọn ghế thành công (FE-04)')).toBeInTheDocument();
    expect(screen.getByText(/Ranh giới tính năng:/i)).toBeInTheDocument();
    expect(screen.getByText(/Chức năng tạo đơn đặt vé/i)).toBeInTheDocument();
  });

  it('disables booking and seats when showtime is past cutoff time', async () => {
    // Cutoff time 1 hour ago
    const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const pastCutoffSeatMap: SeatMapResponse = {
      ...mockSeatMapData,
      startsAt: pastTime,
      bookingClosesAt: pastTime,
    };

    vi.mocked(showtimesApi.getSeats).mockResolvedValue(pastCutoffSeatMap);

    renderSeatPage('/showtimes/101/seats');

    await waitFor(() => {
      expect(screen.getByText('Đã ngừng nhận đặt vé')).toBeInTheDocument();
    });

    // Available seats should be disabled due to cutoff
    const a1Button = screen.getByRole('button', { name: /Ghế A1/i });
    expect(a1Button).toBeDisabled();

    // Summary warning
    expect(screen.getByText('Suất chiếu đã ngừng nhận đặt vé trực tuyến.')).toBeInTheDocument();
  });
});
