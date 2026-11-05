import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '@/pages/HomePage';
import { renderWithProviders } from './test-utils';
import { moviesApi } from '@/features/movies/api/movies.api';
import { cinemasApi } from '@/features/cinemas/api/cinemas.api';

describe('HomePage (FE-03, Section A)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('restores filters and pagination from URL search params', async () => {
    const listSpy = vi.spyOn(moviesApi, 'list').mockResolvedValueOnce({
      content: [
        {
          id: 1,
          title: 'Dune',
          durationMinutes: 155,
          genre: 'Khoa học viễn tưởng',
          status: 'UPCOMING',
          description: null,
          ageRating: 'T16',
          releaseDate: '2026-11-20',
          posterUrl: null,
        },
      ],
      page: 1,
      size: 12,
      totalElements: 25,
      totalPages: 3,
    });

    vi.spyOn(cinemasApi, 'list').mockResolvedValueOnce([]);

    renderWithProviders(<HomePage />, {
      initialEntries: ['/?status=UPCOMING&genre=Khoa%20h%E1%BB%8Dc%20vi%E1%BB%85n%20t%C6%B0%E1%BB%9Fng&page=1'],
    });

    // Check that moviesApi.list was called with restored URL params
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'UPCOMING',
          genre: 'Khoa học viễn tưởng',
          page: 1,
        })
      );
    });

    // Movie card rendered
    expect(await screen.findByText('Dune')).toBeInTheDocument();
    expect(screen.getAllByText('Sắp chiếu').length).toBeGreaterThan(0);
  });

  it('switches tabs between SHOWING, UPCOMING, ENDED and queries backend', async () => {
    const listSpy = vi.spyOn(moviesApi, 'list').mockResolvedValue({
      content: [],
      page: 0,
      size: 12,
      totalElements: 0,
      totalPages: 0,
    });
    vi.spyOn(cinemasApi, 'list').mockResolvedValue([]);

    const user = userEvent.setup();
    renderWithProviders(<HomePage />, {
      initialEntries: ['/'],
    });

    // Default tab is SHOWING
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SHOWING',
        })
      );
    });

    // Click "Phim sắp chiếu" (or "Sắp chiếu")
    const upcomingTab = screen.getByRole('button', { name: /Sắp chiếu/i });
    await user.click(upcomingTab);

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'UPCOMING',
          page: 0,
        })
      );
    });
  });
});
