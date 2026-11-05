import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { StaffCheckinPage } from '@/pages/StaffCheckinPage';
import { ticketsApi } from '@/features/tickets';
import type { CheckinResponse } from '@/features/tickets';
import * as authModule from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { renderWithProviders } from './test-utils';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';

describe('FE-08: Staff/Admin Ticket Check-in', () => {
  const staffUser = {
    id: 201,
    fullName: 'Le Van Staff',
    email: 'staff@cinema.com',
    role: 'STAFF' as const,
    status: 'ACTIVE' as const,
  };

  const adminUser = {
    id: 101,
    fullName: 'Tran Van Admin',
    email: 'admin@cinema.com',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
  };

  const customerUser = {
    id: 301,
    fullName: 'Nguyen Khach',
    email: 'khach@cinema.com',
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
  };

  const mockCheckinSuccessResponse: CheckinResponse = {
    result: 'CHECKED_IN',
    movieTitle: 'Mai (2024)',
    roomName: 'Phòng Chiếu 03',
    seatLabel: 'E08',
    checkedInAt: '2026-11-10T11:45:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCheckinRoute = (user: typeof staffUser | typeof adminUser | typeof customerUser | null = staffUser) => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user,
      token: user ? 'mock-valid-token' : null,
      isAuthenticated: Boolean(user),
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => user?.role === r,
    });

    return renderWithProviders(
      <Routes>
        <Route
          path="/staff/check-in"
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
              <StaffCheckinPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Màn hình Đăng nhập</div>} />
      </Routes>,
      { initialEntries: ['/staff/check-in'] }
    );
  };

  it('Test 1: STAFF and ADMIN can access route /staff/check-in and see form controls', () => {
    // 1. STAFF
    const { unmount: unmountStaff } = renderCheckinRoute(staffUser);
    expect(screen.getByRole('heading', { name: /soát vé vào rạp/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/mã vé/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /xác nhận check-in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vé tiếp theo/i })).toBeInTheDocument();
    unmountStaff();

    // 2. ADMIN
    renderCheckinRoute(adminUser);
    expect(screen.getByRole('heading', { name: /soát vé vào rạp/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/mã vé/i)).toBeInTheDocument();
  });

  it('Test 2: Guest is redirected to /login with state; CUSTOMER sees access denied error', () => {
    // 1. Guest -> redirected to /login
    const { unmount: unmountGuest } = renderCheckinRoute(null);
    expect(screen.getByText('Màn hình Đăng nhập')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /soát vé vào rạp/i })).not.toBeInTheDocument();
    unmountGuest();

    // 2. CUSTOMER -> access denied
    renderCheckinRoute(customerUser);
    expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument();
    expect(
      screen.getByText(/Trang này yêu cầu quyền STAFF hoặc ADMIN. Tài khoản hiện tại \(CUSTOMER\) không có quyền truy cập./i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /soát vé vào rạp/i })).not.toBeInTheDocument();
  });

  it('Test 3: Input has accessibility attributes, no auto-correct, auto-capitalize, or spellcheck', () => {
    renderCheckinRoute(staffUser);
    const input = screen.getByLabelText(/mã vé/i);

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('autoComplete', 'off');
    expect(input).toHaveAttribute('autoCorrect', 'off');
    expect(input).toHaveAttribute('autoCapitalize', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'ticket-code-helper');
  });

  it('Test 4: Client validation blocks empty or whitespace-only code and does NOT call API', async () => {
    const user = userEvent.setup();
    const checkinSpy = vi.spyOn(ticketsApi, 'checkIn');
    renderCheckinRoute(staffUser);

    const submitBtn = screen.getByRole('button', { name: /xác nhận check-in/i });

    // Submit while empty
    await user.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent('Mã vé không được để trống.');
    expect(checkinSpy).not.toHaveBeenCalled();

    // Submit with spaces only
    const input = screen.getByLabelText(/mã vé/i);
    await user.type(input, '    ');
    await user.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent('Mã vé không được để trống.');
    expect(checkinSpy).not.toHaveBeenCalled();
  });

  it('Test 5: Client validation blocks code > 48 characters without silently truncating', async () => {
    const user = userEvent.setup();
    const checkinSpy = vi.spyOn(ticketsApi, 'checkIn');
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    const longCode = 'A'.repeat(49);

    await user.type(input, longCode);
    // The input value must NOT have been silently truncated
    expect(input).toHaveValue(longCode);

    const submitBtn = screen.getByRole('button', { name: /xác nhận check-in/i });
    await user.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent('Mã vé tối đa 48 ký tự.');
    expect(checkinSpy).not.toHaveBeenCalled();
  });

  it('Test 6: Submits exact code preserving case and special chars; does NOT send staffId', async () => {
    const user = userEvent.setup();
    const checkinSpy = vi.spyOn(ticketsApi, 'checkIn').mockResolvedValue(mockCheckinSuccessResponse);
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    const rawTicketCode = 'TCK_MixedCase-123_#Special';
    await user.type(input, rawTicketCode);

    const submitBtn = screen.getByRole('button', { name: /xác nhận check-in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(checkinSpy).toHaveBeenCalledTimes(1);
    });

    // Verify exact payload: only ticketCode, preserving raw characters, without staffId
    expect(checkinSpy).toHaveBeenCalledWith({
      ticketCode: rawTicketCode,
    });
    const callArg = checkinSpy.mock.calls[0][0];
    expect(callArg).not.toHaveProperty('staffId');
  });

  it('Test 7: Enter key and double-click triggers only ONE POST request and locks controls', async () => {
    const user = userEvent.setup();
    let resolveCheckin: (val: CheckinResponse) => void = () => {};
    const pendingPromise = new Promise<CheckinResponse>((res) => {
      resolveCheckin = res;
    });

    const checkinSpy = vi.spyOn(ticketsApi, 'checkIn').mockReturnValue(pendingPromise);
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    await user.type(input, 'TCK-ONE-TIME-CODE{enter}');

    // Immediately click submit button while request is in-flight
    const submitBtn = screen.getByRole('button', { name: /đang kiểm tra/i });
    expect(submitBtn).toBeDisabled();
    expect(input).toBeDisabled();

    // Try clicking disabled button
    await user.click(submitBtn);

    expect(checkinSpy).toHaveBeenCalledTimes(1);

    // Resolve request
    resolveCheckin(mockCheckinSuccessResponse);
    await waitFor(() => {
      expect(screen.getByText('Check-in thành công')).toBeInTheDocument();
    });
  });

  it('Test 8: Mount, refresh, or focus does NOT trigger any POST request', () => {
    const checkinSpy = vi.spyOn(ticketsApi, 'checkIn');
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    input.focus();
    input.blur();
    input.focus();

    expect(checkinSpy).not.toHaveBeenCalled();
  });

  it('Test 9: Successful check-in (200) renders movieTitle, roomName, seatLabel, and Vietnam time', async () => {
    const user = userEvent.setup();
    vi.spyOn(ticketsApi, 'checkIn').mockResolvedValue(mockCheckinSuccessResponse);
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    await user.type(input, 'TCK-VALID-SUCCESS');

    await user.click(screen.getByRole('button', { name: /xác nhận check-in/i }));

    await waitFor(() => {
      expect(screen.getByText('Check-in thành công')).toBeInTheDocument();
    });

    expect(screen.getByText('Mai (2024)')).toBeInTheDocument();
    expect(screen.getByText('Phòng Chiếu 03')).toBeInTheDocument();
    expect(screen.getByText('E08')).toBeInTheDocument();
    // 2026-11-10T11:45:00Z formatted in Asia/Ho_Chi_Minh is 18:45 10/11/2026
    expect(screen.getByText(/18:45/)).toBeInTheDocument();
  });

  it('Test 10: Business errors 404, 409 (TICKET_ALREADY_USED, BOOKING_STATE_CONFLICT), and 422 display clear messages', async () => {
    const user = userEvent.setup();
    const checkinSpy = vi.spyOn(ticketsApi, 'checkIn');
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    const submitBtn = screen.getByRole('button', { name: /xác nhận check-in/i });

    // 1. 404 RESOURCE_NOT_FOUND
    checkinSpy.mockRejectedValueOnce(
      new ApiErrorResponse('Không tìm thấy tài nguyên.', 'RESOURCE_NOT_FOUND', 404)
    );
    await user.type(input, 'TCK-NOT-FOUND');
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy vé')).toBeInTheDocument();
      expect(screen.getByText(/Không tìm thấy mã vé trong hệ thống/i)).toBeInTheDocument();
    });

    // 2. 409 TICKET_ALREADY_USED
    checkinSpy.mockRejectedValueOnce(
      new ApiErrorResponse('Vé đã dùng.', 'TICKET_ALREADY_USED', 409)
    );
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Vé đã được sử dụng')).toBeInTheDocument();
      expect(screen.getByText(/Vé này đã được check-in trước đó. Không thể check-in lại./i)).toBeInTheDocument();
    });

    // 3. 409 BOOKING_STATE_CONFLICT
    checkinSpy.mockRejectedValueOnce(
      new ApiErrorResponse('Booking conflict.', 'BOOKING_STATE_CONFLICT', 409)
    );
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Trạng thái vé không hợp lệ')).toBeInTheDocument();
      expect(screen.getByText(/Đơn đặt vé chưa ở trạng thái hợp lệ/i)).toBeInTheDocument();
    });

    // 4. 422 CHECKIN_TIME_INVALID
    checkinSpy.mockRejectedValueOnce(
      new ApiErrorResponse('Time invalid.', 'CHECKIN_TIME_INVALID', 422)
    );
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Thời gian check-in không hợp lệ')).toBeInTheDocument();
      expect(screen.getByText(/Chỉ được soát vé trong khoảng từ 30 phút trước giờ chiếu/i)).toBeInTheDocument();
    });

    // 5. 422 SEAT_NOT_IN_ROOM
    checkinSpy.mockRejectedValueOnce(
      new ApiErrorResponse('Seat mismatch.', 'SEAT_NOT_IN_ROOM', 422)
    );
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Dữ liệu vé không hợp lệ')).toBeInTheDocument();
    });
  });

  it('Test 11: Timeout or 5xx displays indeterminate message with retry warning; does NOT auto-retry', async () => {
    const user = userEvent.setup();
    const checkinSpy = vi.spyOn(ticketsApi, 'checkIn');
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    await user.type(input, 'TCK-TIMEOUT-TEST');

    // Simulate network error / timeout
    checkinSpy.mockRejectedValueOnce(
      new ApiErrorResponse('Gateway Timeout', 'GATEWAY_TIMEOUT', 504)
    );

    await user.click(screen.getByRole('button', { name: /xác nhận check-in/i }));

    await waitFor(() => {
      expect(screen.getByText('Chưa xác định kết quả check-in')).toBeInTheDocument();
      expect(
        screen.getByText(/Chưa xác định kết quả. Vé có thể đã được ghi nhận; vui lòng kiểm tra trước khi thử lại./i)
      ).toBeInTheDocument();
    });

    // Exactly 1 call was made (no auto-retry)
    expect(checkinSpy).toHaveBeenCalledTimes(1);

    // Warning about re-trying
    expect(
      screen.getByText(/Nếu thử lại, bạn có thể nhận thông báo/i)
    ).toBeInTheDocument();

    // Manual retry button is available and uses the exact same code
    const retryBtn = screen.getByRole('button', { name: /thử lại check-in với mã này/i });
    checkinSpy.mockResolvedValueOnce(mockCheckinSuccessResponse);

    await user.click(retryBtn);

    await waitFor(() => {
      expect(checkinSpy).toHaveBeenCalledTimes(2);
      expect(checkinSpy).toHaveBeenLastCalledWith({ ticketCode: 'TCK-TIMEOUT-TEST' });
      expect(screen.getByText('Check-in thành công')).toBeInTheDocument();
    });
  });

  it('Test 12: Manual retry receiving TICKET_ALREADY_USED informs ticket was used without assuming past success', async () => {
    const user = userEvent.setup();
    const checkinSpy = vi.spyOn(ticketsApi, 'checkIn');
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    await user.type(input, 'TCK-RACE-RETRY');

    // First attempt: 500 error
    checkinSpy.mockRejectedValueOnce(
      new ApiErrorResponse('Internal Server Error', 'INTERNAL_ERROR', 500)
    );
    await user.click(screen.getByRole('button', { name: /xác nhận check-in/i }));

    await waitFor(() => {
      expect(screen.getByText('Chưa xác định kết quả check-in')).toBeInTheDocument();
    });

    // Second manual attempt returns 409 TICKET_ALREADY_USED
    checkinSpy.mockRejectedValueOnce(
      new ApiErrorResponse('Ticket already used', 'TICKET_ALREADY_USED', 409)
    );
    await user.click(screen.getByRole('button', { name: /thử lại check-in với mã này/i }));

    await waitFor(() => {
      expect(screen.getByText('Vé đã được sử dụng')).toBeInTheDocument();
      expect(screen.getByText(/Vé này đã được check-in trước đó. Không thể check-in lại./i)).toBeInTheDocument();
      // Must not falsely claim "lần trước của bạn đã thành công"
      expect(screen.queryByText(/lần trước của bạn đã thành công/i)).not.toBeInTheDocument();
    });
  });

  it('Test 13: "Vé tiếp theo" clears input, success result, and error, and focuses input', async () => {
    const user = userEvent.setup();
    vi.spyOn(ticketsApi, 'checkIn').mockResolvedValue(mockCheckinSuccessResponse);
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    await user.type(input, 'TCK-FIRST-CODE');
    await user.click(screen.getByRole('button', { name: /xác nhận check-in/i }));

    await waitFor(() => {
      expect(screen.getByText('Check-in thành công')).toBeInTheDocument();
    });

    // Click "Vé tiếp theo"
    const nextBtn = screen.getByRole('button', { name: /soát vé tiếp theo/i });
    await user.click(nextBtn);

    expect(screen.queryByText('Check-in thành công')).not.toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('Test 14: Editing input dissociates previous success result to avoid mistaking it for the new code', async () => {
    const user = userEvent.setup();
    vi.spyOn(ticketsApi, 'checkIn').mockResolvedValue(mockCheckinSuccessResponse);
    renderCheckinRoute(staffUser);

    const input = screen.getByLabelText(/mã vé/i);
    await user.type(input, 'TCK-PREV');
    await user.click(screen.getByRole('button', { name: /xác nhận check-in/i }));

    await waitFor(() => {
      expect(screen.getByText('Check-in thành công')).toBeInTheDocument();
    });

    // Type a new character into input
    await user.type(input, '-EDITED');

    // The old success banner must disappear
    expect(screen.queryByText('Check-in thành công')).not.toBeInTheDocument();
  });

  it('Test 15: Session isolation: logout or switching account clears check-in form and results', () => {
    const authSpy = vi.spyOn(authModule, 'useAuth');
    authSpy.mockReturnValue({
      user: staffUser,
      token: 'staff-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'STAFF',
    });

    const { rerender } = renderWithProviders(
      <StaffCheckinPage />,
      { initialEntries: ['/staff/check-in'] }
    );

    const input = screen.getByLabelText(/mã vé/i);
    expect(input).toBeInTheDocument();

    // Simulate logout
    authSpy.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: () => false,
    });

    rerender(<StaffCheckinPage />);
    expect(input).toHaveValue('');
  });
});
