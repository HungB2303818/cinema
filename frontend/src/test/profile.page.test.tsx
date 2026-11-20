import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import * as authModule from '@/features/auth';
import type { User, AuthContextType } from '@/features/auth';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { Header } from '@/shared/components/layout/Header';
import { AdminSidebar } from '@/shared/components/layout/admin/AdminSidebar';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { renderWithProviders } from './test-utils';

const profile: User = {
  id: 3,
  fullName: 'Nguyễn Văn An',
  email: 'an@example.com',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  createdAt: '2026-11-19T18:00:00Z',
};

let auth: AuthContextType;

function LoginDestination() {
  const location = useLocation();
  return <h1>Đăng nhập để tiếp tục {location.state?.from?.pathname}</h1>;
}

function renderProfile() {
  return renderWithProviders(
    <Routes>
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/login" element={<LoginDestination />} />
    </Routes>,
    { initialEntries: ['/profile'] },
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  auth = {
    user: profile, token: 'token', isAuthenticated: true, isLoading: false,
    login: vi.fn(), logout: vi.fn(), hasRole: (role) => auth.user?.role === role,
  };
  vi.spyOn(authModule, 'useAuth').mockImplementation(() => auth);
  vi.spyOn(authModule.authApi, 'getMe').mockResolvedValue(profile);
  vi.spyOn(authModule.authApi, 'updateMe').mockResolvedValue({ token: 'new-token', user: profile });
});

describe('ProfilePage', () => {
  it('loads current account details and formats the joined date in Vietnam time', async () => {
    renderProfile();
    expect(screen.getByText('Đang tải thông tin cá nhân...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: profile.fullName })).toBeInTheDocument();
    expect(screen.getAllByText(profile.email)).toHaveLength(2);
    expect(screen.getByText('Khách hàng')).toBeInTheDocument();
    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
    expect(screen.getByText('20/11/2026')).toBeInTheDocument();
    expect(authModule.authApi.getMe).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lưu|chỉnh sửa/i })).not.toBeInTheDocument();
  });

  it.each([
    ['CUSTOMER', 'Khách hàng'], ['STAFF', 'Nhân viên'], ['ADMIN', 'Quản trị viên'],
  ] as const)('allows the %s role to view its own account', async (role, label) => {
    auth.user = { ...profile, role };
    vi.mocked(authModule.authApi.getMe).mockResolvedValue({ ...profile, role });
    renderProfile();
    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  it('redirects guests to login without calling the profile API', async () => {
    auth = { ...auth, user: null, token: null, isAuthenticated: false };
    renderProfile();
    expect(await screen.findByRole('heading', { name: 'Đăng nhập để tiếp tục /profile' })).toBeInTheDocument();
    expect(authModule.authApi.getMe).not.toHaveBeenCalled();
  });

  it('waits until authentication initialization finishes', () => {
    auth = { ...auth, user: null, isAuthenticated: false, isLoading: true };
    renderProfile();
    expect(screen.getByText('Đang kiểm tra đăng nhập...')).toBeInTheDocument();
    expect(authModule.authApi.getMe).not.toHaveBeenCalled();
  });

  it('allows retry after network failure without signing out', async () => {
    vi.mocked(authModule.authApi.getMe)
      .mockRejectedValueOnce(new ApiErrorResponse('Không thể kết nối máy chủ.', 'NETWORK_ERROR'))
      .mockResolvedValueOnce(profile);
    const user = userEvent.setup();
    renderProfile();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối máy chủ.');
    expect(auth.logout).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { name: profile.fullName })).toBeInTheDocument();
    expect(authModule.authApi.getMe).toHaveBeenCalledTimes(2);
  });

  it('clears authentication and returns to login when the token expires', async () => {
    vi.mocked(authModule.authApi.getMe).mockRejectedValueOnce(new ApiErrorResponse('Phiên đã hết hạn.', 'UNAUTHENTICATED', 401));
    renderProfile();
    expect(await screen.findByRole('heading', { name: 'Đăng nhập để tiếp tục /profile' })).toBeInTheDocument();
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('handles inactive accounts and missing dates without invented data', async () => {
    vi.mocked(authModule.authApi.getMe).mockResolvedValueOnce({ ...profile, status: 'INACTIVE', createdAt: undefined });
    renderProfile();
    expect(await screen.findByText('Không hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Chưa có thông tin')).toBeInTheDocument();
  });

  it('scopes cached profile data to the signed-in user', async () => {
    const { rerender } = renderWithProviders(<ProfilePage />);
    expect(await screen.findByRole('heading', { name: profile.fullName })).toBeInTheDocument();
    const otherUser = { ...profile, id: 4, fullName: 'Trần Bình', email: 'binh@example.com' };
    auth.user = otherUser;
    vi.mocked(authModule.authApi.getMe).mockResolvedValueOnce(otherUser);
    rerender(<ProfilePage />);
    expect(screen.queryByText(profile.email)).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: otherUser.fullName })).toBeInTheDocument();
    await waitFor(() => expect(authModule.authApi.getMe).toHaveBeenCalledTimes(2));
  });

  it('uses the main page background without a bordered profile card', async () => {
    renderProfile();
    const account = await screen.findByRole('region', { name: 'Thông tin tài khoản' });
    expect(account).not.toHaveClass('border');
    expect(account).not.toHaveClass('bg-cinema-surface');
  });

  it('saves the name and updates the header session without clearing booking state', async () => {
    const updatedUser = { ...profile, fullName: 'Nguyễn Văn Bình' };
    vi.mocked(authModule.authApi.updateMe).mockResolvedValueOnce({ token: 'renewed-token', user: updatedUser });
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Sửa thông tin' }));
    const nameInput = screen.getByRole('textbox', { name: 'Họ và tên' });
    await user.clear(nameInput);
    await user.type(nameInput, '  Nguyễn Văn Bình  ');
    expect(screen.queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Vai trò' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã cập nhật thông tin cá nhân.');
    expect(screen.getByRole('heading', { name: updatedUser.fullName })).toBeInTheDocument();
    expect(authModule.authApi.updateMe).toHaveBeenCalledWith({ fullName: updatedUser.fullName, email: profile.email }, expect.anything());
    expect(auth.login).toHaveBeenCalledWith('renewed-token', updatedUser, { preserveBookingState: true });
  });

  it('requires the current password when changing email', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Sửa thông tin' }));
    const emailInput = screen.getByRole('textbox', { name: 'Email' });
    await user.clear(emailInput);
    await user.type(emailInput, 'new@example.com');
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toBeRequired();
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(authModule.authApi.updateMe).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'current-secret');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByRole('status');
    expect(authModule.authApi.updateMe).toHaveBeenCalledWith({
      fullName: profile.fullName, email: 'new@example.com', currentPassword: 'current-secret',
    }, expect.anything());
  });

  it('cancels edits without making a request and restores original values', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Sửa thông tin' }));
    await user.clear(screen.getByRole('textbox', { name: 'Họ và tên' }));
    await user.type(screen.getByRole('textbox', { name: 'Họ và tên' }), 'Unsaved');
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.getByRole('heading', { name: profile.fullName })).toBeInTheDocument();
    expect(authModule.authApi.updateMe).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sửa thông tin' }));
    expect(screen.getByRole('textbox', { name: 'Họ và tên' })).toHaveValue(profile.fullName);
  });

  it('shows save errors without discarding edits or signing out', async () => {
    vi.mocked(authModule.authApi.updateMe).mockRejectedValueOnce(new ApiErrorResponse('Email này đã được sử dụng.', 'DUPLICATE_RESOURCE', 409));
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Sửa thông tin' }));
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email này đã được sử dụng.');
    expect(screen.getByRole('textbox', { name: 'Họ và tên' })).toHaveValue(profile.fullName);
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('disables repeated saves and cancellation while a save is pending', async () => {
    vi.mocked(authModule.authApi.updateMe).mockImplementationOnce(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Sửa thông tin' }));
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Họ và tên' })).toBeDisabled();
  });

  it('returns to login if the session expires during a save', async () => {
    vi.mocked(authModule.authApi.updateMe).mockRejectedValueOnce(new ApiErrorResponse('Phiên đã hết hạn.', 'UNAUTHENTICATED', 401));
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Sửa thông tin' }));
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('heading', { name: 'Đăng nhập để tiếp tục /profile' })).toBeInTheDocument();
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });
});

describe('Profile navigation', () => {
  it('links the desktop account, mobile avatar, and mobile menu to the profile', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Header />, { initialEntries: ['/profile'] });
    screen.getAllByRole('link', { name: 'Thông tin cá nhân' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/profile');
    });
    await user.click(screen.getByRole('button', { name: 'Mở menu' }));
    const menu = screen.getByRole('navigation', { name: 'Menu di động' });
    expect(within(menu).getByRole('link', { name: 'Thông tin cá nhân' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(menu).getByRole('link', { name: 'Thông tin cá nhân' }));
    expect(screen.queryByRole('navigation', { name: 'Menu di động' })).not.toBeInTheDocument();
  });

  it('links the admin account area to the profile', () => {
    auth.user = { ...profile, role: 'ADMIN' };
    renderWithProviders(<AdminSidebar />);
    expect(screen.getByRole('link', { name: 'Thông tin cá nhân' })).toHaveAttribute('href', '/profile');
  });
});
