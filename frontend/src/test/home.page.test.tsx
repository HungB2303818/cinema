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

  it('restores the visible status and pagination but ignores removed genre/search filters', async () => {
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

    // Old links must not apply invisible genre/search filters.
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'UPCOMING',
          page: 1,
        })
      );
    });
    expect(listSpy.mock.calls[0][0]).not.toHaveProperty('genre');
    expect(listSpy.mock.calls[0][0]).not.toHaveProperty('keyword');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Thể loại:')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đã kết thúc' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tất cả phim' })).not.toBeInTheDocument();

    // Movie card rendered
    expect(await screen.findByText('Dune')).toBeInTheDocument();
    expect(screen.getAllByText('Sắp chiếu').length).toBeGreaterThan(0);
  });

  it('switches between SHOWING and UPCOMING and queries backend', async () => {
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

  it.each(['ENDED', 'ALL'])('defaults legacy status %s to SHOWING', async (status) => {
    const listSpy = vi.spyOn(moviesApi, 'list').mockResolvedValue({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    vi.spyOn(cinemasApi, 'list').mockResolvedValue([]);
    renderWithProviders(<HomePage />, { initialEntries: [`/?status=${status}&keyword=test&genre=Horror`] });
    await waitFor(() => expect(listSpy).toHaveBeenCalledWith({ status: 'SHOWING', page: 0, size: 12 }));
  });
});
