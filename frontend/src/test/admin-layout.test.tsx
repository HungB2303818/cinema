import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /quản lý phim/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /phòng chiếu & ghế/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /suất chiếu/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /soát vé/i })).not.toBeInTheDocument();

    // Brand links back to the public home page
    const brandLinks = screen.getAllByRole('link', { name: /cinemaplus/i });
    expect(brandLinks.length).toBeGreaterThan(0);
    brandLinks.forEach((link) => expect(link).toHaveAttribute('href', '/'));

    expect(screen.queryByText('Trang chủ')).not.toBeInTheDocument();
    expect(screen.queryByText('Rạp phim')).not.toBeInTheDocument();
  });

  it('highlights active menu based on pathname', () => {
    const { unmount } = renderWithProviders(<AdminLayout />, { initialEntries: ['/admin/movies'] });
    const moviesLink = screen.getByRole('link', { name: /quản lý phim/i });
    expect(moviesLink).toHaveClass('bg-[#1a1c24]', 'text-[#e6e2c1]');
    expect(moviesLink.querySelector('svg')).toHaveClass('text-[#e6e2c1]');
    expect(moviesLink).toHaveAttribute('aria-current', 'page');
    unmount();

    renderWithProviders(<AdminLayout />, { initialEntries: ['/admin/showtimes'] });
    const showtimesLink = screen.getByRole('link', { name: /suất chiếu/i });
    expect(showtimesLink).toHaveClass('bg-[#1a1c24]', 'text-[#e6e2c1]');
    expect(showtimesLink.querySelector('svg')).toHaveClass('text-[#e6e2c1]');
  });

  it('keeps the selected icon bright after clicking another menu item', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminLayout />, { initialEntries: ['/admin/movies'] });

    const roomsLink = screen.getByRole('link', { name: /phòng chiếu & ghế/i });
    expect(roomsLink.querySelector('svg')).toHaveClass('text-zinc-400');
    await user.click(roomsLink);
    await user.unhover(roomsLink);

    expect(roomsLink).toHaveAttribute('aria-current', 'page');
    expect(roomsLink.querySelector('svg')).toHaveClass('text-[#e6e2c1]');
    const moviesLink = screen.getByRole('link', { name: /quản lý phim/i });
    expect(moviesLink).not.toHaveAttribute('aria-current');
    expect(moviesLink.querySelector('svg')).toHaveClass('text-zinc-400');
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
