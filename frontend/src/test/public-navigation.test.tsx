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

describe('Public navigation with cinema showtimes', () => {
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

  it.each(['/showtimes', '/showtimes?cinemaId=2'])('opens the showtimes page at %s', async (url) => {
    renderWithProviders(<><AppRouter /><LocationProbe /></>, { initialEntries: [url] });
    expect(await screen.findByTestId('location')).toHaveTextContent('/showtimes');
    if (url.includes('cinemaId')) {
      expect(screen.getByRole('group', { name: 'Chọn ngày chiếu' })).toBeInTheDocument();
    }
  });
});
