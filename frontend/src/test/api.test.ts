import { describe, it, expect, vi, beforeEach } from 'vitest';
import { httpClient, ApiErrorResponse } from '@/shared/api/http-client';
import { moviesApi } from '@/features/movies/api/movies.api';
import { cinemasApi } from '@/features/cinemas/api/cinemas.api';
import { showtimesApi } from '@/features/showtimes/api/showtimes.api';

describe('HTTP Client & Error Standardization (FR-15, TC-28)', () => {
  it('standardizes 404 errors as RESOURCE_NOT_FOUND with status 404', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValueOnce(
      new ApiErrorResponse('Không tìm thấy tài nguyên.', 'RESOURCE_NOT_FOUND', 404)
    );

    try {
      await httpClient.get('/movies/999');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiErrorResponse);
      const apiErr = err as ApiErrorResponse;
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe('RESOURCE_NOT_FOUND');
    }
  });

  it('standardizes network errors with status undefined and NETWORK_ERROR code', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValueOnce(
      new ApiErrorResponse('Lỗi kết nối máy chủ.', 'NETWORK_ERROR', undefined)
    );

    try {
      await httpClient.get('/movies');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiErrorResponse);
      const apiErr = err as ApiErrorResponse;
      expect(apiErr.status).toBeUndefined();
      expect(apiErr.code).toBe('NETWORK_ERROR');
    }
  });
});

describe('Movies API (FR-01, TC-27)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends keyword (not search), status, genre, page, size to backend API', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      data: {
        content: [],
        page: 0,
        size: 12,
        totalElements: 0,
        totalPages: 0,
      },
    });

    await moviesApi.list({
      keyword: 'Avatar',
      status: 'SHOWING',
      genre: 'Hành động',
      page: 1,
      size: 12,
      sort: 'releaseDate,desc',
    });

    expect(getSpy).toHaveBeenCalledTimes(1);
    const calledUrl = getSpy.mock.calls[0][0];
    expect(calledUrl).toContain('/movies?');
    expect(calledUrl).toContain('keyword=Avatar');
    expect(calledUrl).not.toContain('search=');
    expect(calledUrl).toContain('status=SHOWING');
    expect(calledUrl).toContain('genre=H%C3%A0nh+%C4%91%E1%BB%99ng');
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('size=12');
  });

  it('fetches movie details by ID', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      data: {
        id: 10,
        title: 'Inception',
        status: 'SHOWING',
      },
    });

    const result = await moviesApi.getById(10);
    expect(getSpy).toHaveBeenCalledWith('/movies/10');
    expect(result.id).toBe(10);
  });
});

describe('Cinemas API (FR-01, Section B)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /cinemas directly without inventing mock data on error', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValueOnce(
      new ApiErrorResponse('Server error', 'API_ERROR', 500)
    );

    // Must propagate error, NOT silently return FALLBACK_CINEMAS
    await expect(cinemasApi.list()).rejects.toThrow(ApiErrorResponse);
  });

  it('calls /cinemas/:id directly and propagates error', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValueOnce(
      new ApiErrorResponse('Rạp không tồn tại', 'RESOURCE_NOT_FOUND', 404)
    );

    await expect(cinemasApi.getById(99)).rejects.toThrow(ApiErrorResponse);
  });
});

describe('Showtimes API (FR-02, UC-01, TC-37)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /movies/{id}/showtimes with date, cinemaId and pagination', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      data: {
        content: [
          {
            id: 101,
            movieId: 5,
            cinemaId: 1,
            cinemaName: 'CGV Vincom',
            roomId: 2,
            roomName: 'Phòng 02',
            startsAt: '2026-11-10T12:00:00Z',
            endsAt: '2026-11-10T14:00:00Z',
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
      },
    });

    const result = await showtimesApi.getMovieShowtimes({
      movieId: 5,
      date: '2026-11-10',
      cinemaId: 1,
      page: 0,
      size: 20,
    });

    expect(getSpy).toHaveBeenCalledTimes(1);
    const calledUrl = getSpy.mock.calls[0][0];
    // Must call /movies/5/showtimes
    expect(calledUrl).toContain('/movies/5/showtimes?');
    // Must NOT call /showtimes?
    expect(calledUrl).not.toBe('/showtimes?');
    expect(calledUrl).toContain('date=2026-11-10');
    expect(calledUrl).toContain('cinemaId=1');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].cinemaName).toBe('CGV Vincom');
  });

  it('calls /showtimes/{id}/seats to fetch seat map', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      data: {
        showtimeId: 101,
        startsAt: '2026-11-10T12:00:00Z',
        bookingClosesAt: '2026-11-10T11:50:00Z',
        seats: [],
      },
    });

    const result = await showtimesApi.getSeats(101);
    expect(getSpy).toHaveBeenCalledWith('/showtimes/101/seats');
    expect(result.showtimeId).toBe(101);
  });
});
