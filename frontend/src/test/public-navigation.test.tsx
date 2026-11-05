import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/shared/components/layout/Header';
import { Footer } from '@/shared/components/layout/Footer';
import { AppRouter } from '@/app/router';
import * as auth from '@/features/auth';
import { moviesApi } from '@/features/movies';
import { cinemasApi } from '@/features/cinemas';
import { renderWithProviders } from './test-utils';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe('Public navigation without a standalone showtimes page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, 'useAuth').mockReturnValue({
      user: null, token: null, isAuthenticated: false, isLoading: false,
      login: vi.fn(), logout: vi.fn(), hasRole: () => false,
    });
    vi.spyOn(moviesApi, 'list').mockResolvedValue({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    vi.spyOn(cinemasApi, 'list').mockResolvedValue([]);
  });

  it('removes showtimes links from desktop/mobile header and footer', () => {
    renderWithProviders(<><Header /><Footer /></>);
    expect(within(screen.getByRole('navigation', { name: 'Menu chính' })).queryByRole('link', { name: 'Lịch chiếu' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    expect(within(screen.getByRole('navigation', { name: 'Menu di động' })).queryByRole('link', { name: 'Lịch chiếu' })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/showtimes"]')).not.toBeInTheDocument();
  });

  it.each(['/showtimes', '/showtimes?cinemaId=2&date=2026-11-06'])('redirects the old URL %s to movies', async (url) => {
    renderWithProviders(<><AppRouter /><LocationProbe /></>, { initialEntries: [url] });
    expect(await screen.findByTestId('location')).toHaveTextContent('/movies');
    expect(screen.queryByRole('group', { name: 'Chọn ngày chiếu' })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/showtimes"]')).not.toBeInTheDocument();
  });
});
