import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ShowtimesPage } from '@/pages/ShowtimesPage';
import { renderWithProviders } from './test-utils';
import { showtimesApi } from '@/features/showtimes/api/showtimes.api';
import { cinemasApi } from '@/features/cinemas/api/cinemas.api';
import type { PageResponse } from '@/shared/types/api.types';
import type { CinemaMovieShowtimeGroup } from '@/features/showtimes';

describe('Cinema Showtimes (Part A / TC-46..49)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCinemas = [
    { id: 1, name: 'CGV Vincom', address: 'Xuân Khánh, Cần Thơ', status: 'ACTIVE' as const },
    { id: 2, name: 'Lotte Cinema', address: 'Ninh Kiều, Cần Thơ', status: 'ACTIVE' as const },
  ];

  const mockCinemaSchedule: PageResponse<CinemaMovieShowtimeGroup> = {
    content: [
      {
        movie: {
          id: 10,
          title: 'Dune: Hành Tinh Cát 2',
          posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
          ageRating: 'T18',
          durationMinutes: 166,
        },
        showtimes: [
          {
            id: 101,
            movieId: 10,
            cinemaId: 1,
            cinemaName: 'CGV Vincom',
            roomId: 201,
            roomName: 'Phòng 01',
            startsAt: '2026-11-10T11:00:00Z',
            endsAt: '2026-11-10T13:46:00Z',
            cleanupMinutes: 15,
            basePrice: 75000,
            vipSurcharge: 20000,
            status: 'SCHEDULED',
          },
          {
            id: 102,
            movieId: 10,
            cinemaId: 1,
            cinemaName: 'CGV Vincom',
            roomId: 202,
            roomName: 'Phòng 02', // Same time, different room!
            startsAt: '2026-11-10T11:00:00Z',
            endsAt: '2026-11-10T13:46:00Z',
            cleanupMinutes: 15,
            basePrice: 85000,
            vipSurcharge: 20000,
            status: 'SCHEDULED',
          },
          {
            id: 103,
            movieId: 10,
            cinemaId: 1,
            cinemaName: 'CGV Vincom',
            roomId: 201,
            roomName: 'Phòng 01',
            startsAt: '2020-01-01T10:00:00Z', // Past cutoff
            endsAt: '2020-01-01T12:00:00Z',
            cleanupMinutes: 15,
            basePrice: 75000,
            vipSurcharge: 0,
            status: 'SCHEDULED',
          },
        ],
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };

  it('TC-46: displays cinema showtimes immediately without selecting a movie first', async () => {
    vi.spyOn(cinemasApi, 'list').mockResolvedValue(mockCinemas);
    const getCinemaShowtimesSpy = vi
      .spyOn(showtimesApi, 'getCinemaShowtimes')
      .mockResolvedValue(mockCinemaSchedule);

    renderWithProviders(<ShowtimesPage />, {
      initialEntries: ['/showtimes?cinemaId=1&date=2026-11-10'],
    });

    expect(getCinemaShowtimesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ cinemaId: 1, date: '2026-11-10' })
    );

    // Verify cinema header & movie group title
    expect(await screen.findByRole('heading', { level: 1, name: 'CGV Vincom' }, { timeout: 4000 })).toBeInTheDocument();
    expect(await screen.findByText('Dune: Hành Tinh Cát 2', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('T18')).toBeInTheDocument();
    expect(screen.getByText(/166 phút/i)).toBeInTheDocument();
  });

  it('TC-47: separates showtimes at same time in different rooms without merging', async () => {
    vi.spyOn(cinemasApi, 'list').mockResolvedValue(mockCinemas);
    vi.spyOn(showtimesApi, 'getCinemaShowtimes').mockResolvedValue(mockCinemaSchedule);

    renderWithProviders(<ShowtimesPage />, {
      initialEntries: ['/showtimes?cinemaId=1&date=2026-11-10'],
    });

    expect(await screen.findByText('Dune: Hành Tinh Cát 2')).toBeInTheDocument();

    // Verify two showtimes at 18:00 (11:00 UTC = 18:00 VN) with separate room names
    const room1Labels = screen.getAllByText('Phòng 01');
    const room2Labels = screen.getAllByText('Phòng 02');

    expect(room1Labels.length).toBeGreaterThan(0);
    expect(room2Labels.length).toBeGreaterThan(0);

    // Verify links direct to seat selection
    const links = screen.getAllByRole('link', { name: /Dune: Hành Tinh Cát 2/i });
    const showtime101Link = links.find((l) => l.getAttribute('href') === '/showtimes/101/seats');
    const showtime102Link = links.find((l) => l.getAttribute('href') === '/showtimes/102/seats');

    expect(showtime101Link).toBeDefined();
    expect(showtime102Link).toBeDefined();
  });

  it('TC-49: disables showtime that has reached cutoff', async () => {
    vi.spyOn(cinemasApi, 'list').mockResolvedValue(mockCinemas);
    vi.spyOn(showtimesApi, 'getCinemaShowtimes').mockResolvedValue(mockCinemaSchedule);

    renderWithProviders(<ShowtimesPage />, {
      initialEntries: ['/showtimes?cinemaId=1&date=2026-11-10'],
    });

    expect(await screen.findByText('Dune: Hành Tinh Cát 2')).toBeInTheDocument();

    // Showtime 103 (past cutoff) should render as disabled button, not link
    const disabledBtn = screen.getByRole('button', {
      name: /Dune: Hành Tinh Cát 2.*Không khả dụng/i,
    });
    expect(disabledBtn).toBeDisabled();
  });

  it('TC-48: displays empty state when cinema has no showtimes for the date', async () => {
    vi.spyOn(cinemasApi, 'list').mockResolvedValue(mockCinemas);
    vi.spyOn(showtimesApi, 'getCinemaShowtimes').mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });

    renderWithProviders(<ShowtimesPage />, {
      initialEntries: ['/showtimes?cinemaId=1&date=2026-11-10'],
    });

    expect(
      await screen.findByText(/Không có suất chiếu nào trong ngày/i)
    ).toBeInTheDocument();
  });

  it('TC-48: displays error state with retry on network or server error', async () => {
    vi.spyOn(cinemasApi, 'list').mockResolvedValue(mockCinemas);
    const getCinemaShowtimesSpy = vi
      .spyOn(showtimesApi, 'getCinemaShowtimes')
      .mockRejectedValueOnce(new Error('Lỗi máy chủ'));

    renderWithProviders(<ShowtimesPage />, {
      initialEntries: ['/showtimes?cinemaId=1&date=2026-11-10'],
    });

    expect(
      await screen.findByText('Không thể tải lịch chiếu của rạp')
    ).toBeInTheDocument();

    // Clicking retry calls API again
    getCinemaShowtimesSpy.mockResolvedValueOnce(mockCinemaSchedule);
    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Dune: Hành Tinh Cát 2')).toBeInTheDocument();
  });
});
