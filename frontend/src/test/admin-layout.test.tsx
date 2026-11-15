import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/shared/components/layout/AdminLayout';
import * as authModule from '@/features/auth';
import { renderWithProviders } from './test-utils';

describe('AdminLayout sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 1, fullName: 'Admin User', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
      token: 'admin-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r: string) => r === 'ADMIN',
    });
  });

  it('renders sidebar navigation items and no public navigation items', () => {
    renderWithProviders(<AdminLayout />, { initialEntries: ['/admin'] });

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /quản lý phim/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /phòng chiếu & ghế/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /suất chiếu/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /soát vé/i })).toBeInTheDocument();

    expect(screen.queryByText('Trang chủ')).not.toBeInTheDocument();
    expect(screen.queryByText('Rạp phim')).not.toBeInTheDocument();
  });

  it('highlights active menu based on pathname', () => {
    const { unmount } = renderWithProviders(<AdminLayout />, { initialEntries: ['/admin/movies'] });
    const moviesLink = screen.getByRole('link', { name: /quản lý phim/i });
    expect(moviesLink).toHaveClass('bg-[#e6e2c1]');
    expect(moviesLink).toHaveAttribute('aria-current', 'page');
    unmount();

    renderWithProviders(<AdminLayout />, { initialEntries: ['/admin'] });
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('bg-[#e6e2c1]');
  });

  it('renders mobile sidebar toggle with aria attributes', () => {
    renderWithProviders(<AdminLayout />, { initialEntries: ['/admin'] });
    const toggle = screen.getByRole('button', { name: /mở menu quản trị/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders admin child routes inside the layout and highlights nested route parents', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/movies/new" element={<h1>Trang tạo phim</h1>} />
        </Route>
      </Routes>,
      { initialEntries: ['/admin/movies/new'] }
    );

    expect(screen.getByText('Trang tạo phim')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menu quản trị' })).toBeInTheDocument();
    const moviesLink = screen.getByRole('link', { name: /quản lý phim/i });
    expect(moviesLink).toHaveAttribute('aria-current', 'page');
  });
});