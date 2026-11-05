import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CinemasPage } from '@/pages/CinemasPage';
import { renderWithProviders } from './test-utils';
import { cinemasApi } from '@/features/cinemas/api/cinemas.api';
import { ApiErrorResponse } from '@/shared/api/http-client';

describe('CinemasPage (FE-03, Section B)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays loading then error with retry when API fails without fabricating fake cinemas', async () => {
    vi.spyOn(cinemasApi, 'list').mockRejectedValueOnce(
      new ApiErrorResponse('Lỗi máy chủ', 'API_ERROR', 500)
    );

    renderWithProviders(<CinemasPage />);

    expect(await screen.findByText('Không thể tải danh sách rạp phim')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
    // Must NOT contain fallback mock cinemas
    expect(screen.queryByText('CGV Sense City Cần Thơ')).not.toBeInTheDocument();
  });

  it('renders real cinemas list and navigates to showtimes', async () => {
    vi.spyOn(cinemasApi, 'list').mockResolvedValueOnce([
      {
        id: 1,
        name: 'Rạp Quốc Gia',
        address: '87 Láng Hạ, Hà Nội',
        status: 'ACTIVE',
      },
    ]);

    renderWithProviders(<CinemasPage />);

    expect(await screen.findByText('Rạp Quốc Gia')).toBeInTheDocument();
    expect(screen.getByText('87 Láng Hạ, Hà Nội')).toBeInTheDocument();
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0);

    const showtimeLink = screen.getByRole('link', { name: /Lịch chiếu/i });
    expect(showtimeLink.getAttribute('href')).toMatch(/^\/showtimes\?cinemaId=1&date=\d{4}-\d{2}-\d{2}$/);
  });

  it('opens room modal and displays real rooms', async () => {
    vi.spyOn(cinemasApi, 'list').mockResolvedValueOnce([
      {
        id: 1,
        name: 'Rạp Quốc Gia',
        address: '87 Láng Hạ, Hà Nội',
        status: 'ACTIVE',
      },
    ]);

    vi.spyOn(cinemasApi, 'getById').mockResolvedValueOnce({
      id: 1,
      name: 'Rạp Quốc Gia',
      address: '87 Láng Hạ, Hà Nội',
      status: 'ACTIVE',
      rooms: [
        { id: 10, cinemaId: 1, name: 'Phòng 01 Chiếu Phim', status: 'ACTIVE' },
      ],
    });

    const user = userEvent.setup();
    renderWithProviders(<CinemasPage />);

    expect(await screen.findByText('Rạp Quốc Gia')).toBeInTheDocument();

    const roomsButton = screen.getByRole('button', { name: /Phòng chiếu/i });
    await user.click(roomsButton);

    expect(await screen.findByText('Phòng 01 Chiếu Phim')).toBeInTheDocument();
  });

  it('renders representative cinema image or clear fallback placeholder', async () => {
    vi.spyOn(cinemasApi, 'list').mockResolvedValueOnce([
      {
        id: 1,
        name: 'CGV Sense City Cần Thơ',
        address: 'Số 1 Đại Lộ Hòa Bình, Quận Ninh Kiều, Cần Thơ',
        status: 'ACTIVE',
      },
      {
        id: 2,
        name: 'Rạp Mới Chưa Có Ảnh',
        address: '123 Đường Mới, Quận 1',
        status: 'ACTIVE',
      },
    ]);

    renderWithProviders(<CinemasPage />);

    expect(await screen.findByText('CGV Sense City Cần Thơ')).toBeInTheDocument();

    // The first cinema should have an img with alt
    const imgSenseCity = screen.getByAltText('Hình ảnh rạp CGV Sense City Cần Thơ');
    expect(imgSenseCity).toBeInTheDocument();
    expect(imgSenseCity).toHaveAttribute('src', expect.stringContaining('cgv'));

    // The second cinema without known image should display placeholder
    expect(screen.getByText('Chưa có hình ảnh rạp')).toBeInTheDocument();
  });
});
