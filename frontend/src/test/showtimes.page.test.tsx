import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { ShowtimesPage } from '@/pages/ShowtimesPage';
import { renderWithProviders } from './test-utils';
import { showtimesApi } from '@/features/showtimes/api/showtimes.api';
import { moviesApi } from '@/features/movies/api/movies.api';
import { cinemasApi } from '@/features/cinemas/api/cinemas.api';
import { getVietnamDateString } from '@/shared/utils/format';

describe('ShowtimesPage (FE-03, Section C)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does NOT call showtime query when no movie is selected and displays movie picker', async () => {
    const showtimeSpy = vi.spyOn(showtimesApi, 'getMovieShowtimes');
    vi.spyOn(cinemasApi, 'list').mockResolvedValueOnce([
      { id: 1, name: 'CGV Vincom', address: 'Xuân Khánh', status: 'ACTIVE' },
    ]);
    vi.spyOn(moviesApi, 'list').mockResolvedValueOnce({
      content: [
        {
          id: 1,
          title: 'Dune: Part Two',
          durationMinutes: 166,
          genre: 'Sci-Fi',
          status: 'SHOWING',
          description: null,
          ageRating: 'T16',
          releaseDate: '2026-11-01',
          posterUrl: null,
        },
      ],
      page: 0,
      size: 50,
      totalElements: 1,
      totalPages: 1,
    });

    renderWithProviders(<ShowtimesPage />, {
      initialEntries: ['/showtimes'],
    });

    // Verify warning / movie picker message is shown
    expect(
      await screen.findByText(/Vui lòng chọn bộ phim để xem lịch chiếu/i)
    ).toBeInTheDocument();

    // Verify available movie is rendered
    expect(await screen.findByText('Dune: Part Two')).toBeInTheDocument();

    // Verify getMovieShowtimes was NOT called
    expect(showtimeSpy).not.toHaveBeenCalled();
  });

  it('calls showtime query with correct parameters when movieId is selected in URL', async () => {
    const today = getVietnamDateString();
    const showtimeSpy = vi.spyOn(showtimesApi, 'getMovieShowtimes').mockResolvedValueOnce({
      content: [
        {
          id: 101,
          movieId: 1,
          cinemaId: 1,
          cinemaName: 'CGV Vincom',
          roomId: 2,
          roomName: 'Phòng 02',
          // Starts in 2 hours -> well ahead of cutoff
          startsAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          endsAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          cleanupMinutes: 15,
          basePrice: 75000,
          vipSurcharge: 20000,
          status: 'SCHEDULED',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    vi.spyOn(moviesApi, 'getById').mockResolvedValueOnce({
      id: 1,
      title: 'Dune: Part Two',
      durationMinutes: 166,
      genre: 'Sci-Fi',
      status: 'SHOWING',
      description: null,
      ageRating: 'T16',
      releaseDate: '2026-11-01',
      posterUrl: null,
    });

    vi.spyOn(cinemasApi, 'list').mockResolvedValueOnce([
      { id: 1, name: 'CGV Vincom', address: 'Xuân Khánh', status: 'ACTIVE' },
    ]);

    renderWithProviders(<ShowtimesPage />, {
      initialEntries: [`/showtimes?movieId=1&date=${today}&cinemaId=1`],
    });

    // Check movie title header
    expect(await screen.findByText('Dune: Part Two')).toBeInTheDocument();

    // Verify showtime query called with correct parameters
    await waitFor(() => {
      expect(showtimeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          movieId: 1,
          date: today,
          cinemaId: 1,
        })
      );
    });

    // Check showtime card is rendered
    expect((await screen.findAllByText('CGV Vincom')).length).toBeGreaterThan(0);
    expect(screen.getByText('Phòng 02')).toBeInTheDocument();

    // Verify action button links to /showtimes/:showtimeId/seats
    const chooseSeatLink = screen.getByRole('link', { name: /Chọn ghế/i });
    expect(chooseSeatLink).toHaveAttribute('href', '/showtimes/101/seats');
  });

  it('disables booking button when showtime has reached 10-minute cutoff', async () => {
    // Starts in 5 minutes -> already past the 10-minute cutoff!
    const cutoffTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    vi.spyOn(showtimesApi, 'getMovieShowtimes').mockResolvedValueOnce({
      content: [
        {
          id: 102,
          movieId: 1,
          cinemaId: 1,
          cinemaName: 'CGV Vincom',
          roomId: 2,
          roomName: 'Phòng 02',
          startsAt: cutoffTime,
          endsAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          cleanupMinutes: 15,
          basePrice: 75000,
          vipSurcharge: 20000,
          status: 'SCHEDULED',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    vi.spyOn(moviesApi, 'getById').mockResolvedValueOnce({
      id: 1,
      title: 'Dune: Part Two',
      durationMinutes: 166,
      genre: 'Sci-Fi',
      status: 'SHOWING',
      description: null,
      ageRating: 'T16',
      releaseDate: '2026-11-01',
      posterUrl: null,
    });

    vi.spyOn(cinemasApi, 'list').mockResolvedValueOnce([]);

    renderWithProviders(<ShowtimesPage />, {
      initialEntries: ['/showtimes?movieId=1&date=2026-11-10'],
    });

    // Should display cutoff notice
    expect(
      await screen.findByText(/Đã đóng đặt vé \(trước giờ chiếu 10 phút\)/i)
    ).toBeInTheDocument();

    // Button should be disabled with "Đã quá giờ đặt"
    const disabledButton = screen.getByRole('button', { name: /Đã quá giờ đặt/i });
    expect(disabledButton).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Chọn ghế/i })).not.toBeInTheDocument();
  });
});
