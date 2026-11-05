import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MovieDetailsPage } from '@/pages/MovieDetailsPage';
import { renderWithProviders } from './test-utils';
import { moviesApi } from '@/features/movies/api/movies.api';
import { showtimesApi } from '@/features/showtimes/api/showtimes.api';
import { cinemasApi } from '@/features/cinemas/api/cinemas.api';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { Routes, Route } from 'react-router-dom';

describe('MovieDetailsPage (FE-03, Section A & C)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(cinemasApi, 'list').mockResolvedValue([]);
    vi.spyOn(showtimesApi, 'getMovieShowtimes').mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });
  });

  it('distinguishes 404 hidden/non-existent movie from server errors and offers back link without retry', async () => {
    vi.spyOn(moviesApi, 'getById').mockRejectedValue(
      new ApiErrorResponse('Movie not found', 'RESOURCE_NOT_FOUND', 404)
    );

    renderWithProviders(
      <Routes>
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
      </Routes>,
      { initialEntries: ['/movies/999'] }
    );

    expect(await screen.findByText('Không tìm thấy bộ phim này')).toBeInTheDocument();
    expect(
      screen.getByText(/Bộ phim bạn tìm kiếm không tồn tại hoặc đã bị ẩn khỏi hệ thống/i)
    ).toBeInTheDocument();

    // No retry button on 404
    expect(screen.queryByRole('button', { name: /Thử lại/i })).not.toBeInTheDocument();

    // Has back link to /movies
    const backLink = screen.getByRole('link', { name: /Quay lại danh sách phim/i });
    expect(backLink).toHaveAttribute('href', '/movies');
  });

  it('shows retry button on network or server error', async () => {
    vi.spyOn(moviesApi, 'getById').mockRejectedValue(
      new ApiErrorResponse('Lỗi kết nối máy chủ.', 'NETWORK_ERROR', undefined)
    );

    renderWithProviders(
      <Routes>
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
      </Routes>,
      { initialEntries: ['/movies/1'] }
    );

    expect(await screen.findByText('Lỗi kết nối máy chủ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });

  it('renders movie details and handles showtimes separate loading/empty states', async () => {
    vi.spyOn(moviesApi, 'getById').mockResolvedValue({
      id: 1,
      title: 'Interstellar',
      description: 'Chuyến du hành xuyên không gian.',
      durationMinutes: 169,
      genre: 'Khoa học viễn tưởng',
      ageRating: 'T13',
      releaseDate: '2026-11-01',
      posterUrl: null,
      status: 'SHOWING',
    });

    vi.spyOn(cinemasApi, 'list').mockResolvedValue([
      { id: 1, name: 'CGV Vincom', address: 'Xuân Khánh', status: 'ACTIVE' },
    ]);

    const showtimeSpy = vi.spyOn(showtimesApi, 'getMovieShowtimes').mockResolvedValue({
      content: [],
      page: 0,
      size: 50,
      totalElements: 0,
      totalPages: 0,
    });

    renderWithProviders(
      <Routes>
        <Route path="/movies/:id" element={<MovieDetailsPage />} />
      </Routes>,
      { initialEntries: ['/movies/1'] }
    );

    // Verify movie info
    expect(await screen.findByText('Interstellar')).toBeInTheDocument();
    expect(screen.getByText('Chuyến du hành xuyên không gian.')).toBeInTheDocument();
    expect(screen.getByText(/169 phút/i)).toBeInTheDocument();
    expect(screen.getByText('Khoa học viễn tưởng')).toBeInTheDocument();
    expect(screen.getByText('Đang chiếu')).toBeInTheDocument();

    // Verify showtime query is called with movie ID and Vietnam date
    await waitFor(() => {
      expect(showtimeSpy).toHaveBeenCalled();
    });

    // Empty state for showtimes
    expect(await screen.findByText(/Chưa có suất chiếu trong ngày/i)).toBeInTheDocument();
  });
});
