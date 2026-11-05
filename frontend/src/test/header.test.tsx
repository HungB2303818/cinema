import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Header } from '@/shared/components/layout/Header';
import * as authModule from '@/features/auth';
import { renderWithProviders } from './test-utils';

describe('Header Navigation & Role Scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHeader = (initialUrl: string, variant: 'customer' | 'admin' | 'auth' = 'customer') => {
    return renderWithProviders(<Header variant={variant} />, {
      initialEntries: [initialUrl],
    });
  };

  it('renders single "Phim" link and does NOT render "Phim đang chiếu" or "Phim sắp chiếu"', () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: () => false,
    });

    renderHeader('/');

    // "Phim" link is present
    const movieLinks = screen.getAllByRole('link', { name: 'Phim' });
    expect(movieLinks.length).toBeGreaterThanOrEqual(1);
    expect(movieLinks[0]).toHaveAttribute('href', '/movies');

    // "Phim đang chiếu" and "Phim sắp chiếu" are gone
    expect(screen.queryByText('Phim đang chiếu')).not.toBeInTheDocument();
    expect(screen.queryByText('Phim sắp chiếu')).not.toBeInTheDocument();
  });

  it('marks "Phim" as active on /movies, /movies?status=SHOWING, /movies?status=UPCOMING, and /movies/:id', () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: () => false,
    });

    // 1. /movies
    const { unmount: u1 } = renderHeader('/movies');
    let phimDesktopLink = screen.getAllByRole('link', { name: 'Phim' })[0];
    expect(phimDesktopLink).toHaveClass('bg-[#e6e2c1]');
    u1();

    // 2. /movies?status=SHOWING
    const { unmount: u2 } = renderHeader('/movies?status=SHOWING');
    phimDesktopLink = screen.getAllByRole('link', { name: 'Phim' })[0];
    expect(phimDesktopLink).toHaveClass('bg-[#e6e2c1]');
    u2();

    // 3. /movies?status=UPCOMING
    const { unmount: u3 } = renderHeader('/movies?status=UPCOMING');
    phimDesktopLink = screen.getAllByRole('link', { name: 'Phim' })[0];
    expect(phimDesktopLink).toHaveClass('bg-[#e6e2c1]');
    u3();

    // 4. /movies/42
    const { unmount: u4 } = renderHeader('/movies/42');
    phimDesktopLink = screen.getAllByRole('link', { name: 'Phim' })[0];
    expect(phimDesktopLink).toHaveClass('bg-[#e6e2c1]');
    u4();
  });

  it('displays "Vé của tôi" ONLY for logged-in CUSTOMER, not for Guest, STAFF, or ADMIN', () => {
    // 1. Guest -> NO "Vé của tôi"
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: () => false,
    });
    const { unmount: uGuest } = renderHeader('/');
    expect(screen.queryByText('Vé của tôi')).not.toBeInTheDocument();
    uGuest();

    // 2. STAFF -> NO "Vé của tôi"
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 2, fullName: 'Staff Member', email: 'staff@example.com', role: 'STAFF', status: 'ACTIVE' },
      token: 'staff-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'STAFF',
    });
    const { unmount: uStaff } = renderHeader('/');
    expect(screen.queryByText('Vé của tôi')).not.toBeInTheDocument();
    uStaff();

    // 3. ADMIN -> NO "Vé của tôi" (even on main/customer layout)
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 1, fullName: 'Admin User', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
      token: 'admin-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'ADMIN',
    });
    const { unmount: uAdmin } = renderHeader('/');
    expect(screen.queryByText('Vé của tôi')).not.toBeInTheDocument();
    uAdmin();

    // 4. CUSTOMER -> SHOWS "Vé của tôi"
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 3, fullName: 'Customer One', email: 'cust@example.com', role: 'CUSTOMER', status: 'ACTIVE' },
      token: 'cust-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'CUSTOMER',
    });
    renderHeader('/');
    expect(screen.getAllByRole('link', { name: 'Vé của tôi' })[0]).toBeInTheDocument();
  });

  it('displays "Soát vé" link ONLY for STAFF and ADMIN, and NOT for Guest or CUSTOMER', () => {
    // 1. Guest -> NO "Soát vé"
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: () => false,
    });
    const { unmount: uGuest } = renderHeader('/');
    expect(screen.queryByText('Soát vé')).not.toBeInTheDocument();
    uGuest();

    // 2. CUSTOMER -> NO "Soát vé"
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 3, fullName: 'Customer One', email: 'cust@example.com', role: 'CUSTOMER', status: 'ACTIVE' },
      token: 'cust-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'CUSTOMER',
    });
    const { unmount: uCustomer } = renderHeader('/');
    expect(screen.queryByText('Soát vé')).not.toBeInTheDocument();
    uCustomer();

    // 3. STAFF -> SHOWS "Soát vé" linking to /staff/check-in
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 2, fullName: 'Staff User', email: 'staff@example.com', role: 'STAFF', status: 'ACTIVE' },
      token: 'staff-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'STAFF',
    });
    const { unmount: uStaff } = renderHeader('/');
    const staffCheckinLinks = screen.getAllByRole('link', { name: /soát vé/i });
    expect(staffCheckinLinks.length).toBeGreaterThanOrEqual(1);
    expect(staffCheckinLinks[0]).toHaveAttribute('href', '/staff/check-in');
    uStaff();

    // 4. ADMIN -> SHOWS "Soát vé" on main layout
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { id: 1, fullName: 'Admin User', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
      token: 'admin-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => r === 'ADMIN',
    });
    const { unmount: uAdmin } = renderHeader('/');
    const adminCheckinLinks = screen.getAllByRole('link', { name: /soát vé/i });
    expect(adminCheckinLinks.length).toBeGreaterThanOrEqual(1);
    expect(adminCheckinLinks[0]).toHaveAttribute('href', '/staff/check-in');
    uAdmin();

    // 5. ADMIN Header variant -> SHOWS "Soát vé" button/link
    renderHeader('/admin', 'admin');
    const adminPanelCheckin = screen.getByRole('link', { name: /soát vé/i });
    expect(adminPanelCheckin).toHaveAttribute('href', '/staff/check-in');
  });
});
