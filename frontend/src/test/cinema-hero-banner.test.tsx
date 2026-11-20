import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { CinemaHeroBanner } from '@/features/cinemas/components/CinemaHeroBanner';
import type { Cinema } from '@/features/cinemas';
import { renderWithProviders } from './test-utils';

const cinemas: Cinema[] = [
  { id: 2, name: 'CGV Sense City Cần Thơ', address: 'Tầng 3, số 1 Đại Lộ Hòa Bình, Cần Thơ', status: 'ACTIVE' },
  { id: 3, name: 'CGV Vincom Xuân Khánh', address: 'Tầng 5, số 209 đường 30/04, Cần Thơ', status: 'ACTIVE' },
  { id: 4, name: 'CGV Vincom Hùng Vương', address: 'Tầng 6, số 2 Hùng Vương, Cần Thơ', status: 'ACTIVE' },
  { id: 1, name: 'CGV Demo Cinema', address: 'Hà Nội', status: 'ACTIVE' },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('CinemaHeroBanner', () => {
  it('shows the cinema name above three photographs with only two navigation arrows', () => {
    renderWithProviders(<CinemaHeroBanner cinemas={cinemas} />);

    expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(3);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Rạp trước' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rạp tiếp theo' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: cinemas[0]!.name })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Chọn ảnh rạp' })).not.toBeInTheDocument();
    expect(screen.queryByText('CGV Demo Cinema')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Không gian CGV Sense City Cần Thơ' }))
      .toHaveAttribute('src', expect.stringContaining('/1/_/1_2_.png'));
    expect(screen.getByRole('img', { name: 'Không gian CGV Sense City Cần Thơ' }))
      .toHaveAttribute('fetchpriority', 'high');
    expect(screen.queryByText(cinemas[0]!.address)).not.toBeInTheDocument();
  });

  it('keeps the name and image in sync when arrow buttons or keys change slides', () => {
    renderWithProviders(<CinemaHeroBanner cinemas={cinemas} />);
    const banner = screen.getByRole('region', { name: 'Khám phá không gian các rạp phim' });

    fireEvent.click(screen.getByRole('button', { name: 'Rạp tiếp theo' }));
    expect(screen.getByRole('heading', { name: cinemas[1]!.name })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[1]!.name}` }))
      .toHaveAttribute('src', expect.stringContaining('/v/x/vxk-1_1.png'));
    fireEvent.keyDown(banner, { key: 'ArrowRight' });
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[2]!.name}` })).toBeInTheDocument();
    fireEvent.keyDown(banner, { key: 'ArrowRight' });
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[0]!.name}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rạp trước' }));
    expect(screen.getByRole('heading', { name: cinemas[2]!.name })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[2]!.name}` })).toBeInTheDocument();
  });

  it('automatically advances but pauses on hover and keyboard focus', () => {
    vi.useFakeTimers();
    renderWithProviders(<CinemaHeroBanner cinemas={cinemas} />);
    const banner = screen.getByRole('region', { name: 'Khám phá không gian các rạp phim' });

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('heading', { name: cinemas[1]!.name })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[1]!.name}` })).toBeInTheDocument();
    fireEvent.mouseEnter(banner);
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[1]!.name}` })).toBeInTheDocument();
    fireEvent.mouseLeave(banner);
    expect(banner).toHaveAttribute('tabindex', '0');
    fireEvent.focus(banner);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[1]!.name}` })).toBeInTheDocument();
    fireEvent.blur(banner);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[2]!.name}` })).toBeInTheDocument();
  });

  it('respects reduced motion while still allowing manual navigation', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.useFakeTimers();
    renderWithProviders(<CinemaHeroBanner cinemas={cinemas} />);
    act(() => vi.advanceTimersByTime(18000));
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[0]!.name}` })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' });
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[1]!.name}` })).toBeInTheDocument();
  });

  it('handles broken images without losing the slideshow', () => {
    renderWithProviders(<CinemaHeroBanner cinemas={cinemas} />);
    fireEvent.error(screen.getByRole('img', { name: `Không gian ${cinemas[0]!.name}` }));
    expect(screen.getByText('Không tải được hình ảnh rạp')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' });
    expect(screen.getByRole('img', { name: `Không gian ${cinemas[1]!.name}` })).toBeInTheDocument();
  });

  it('does not fabricate slides when cinema data is missing', () => {
    const { rerender } = renderWithProviders(<CinemaHeroBanner cinemas={[]} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    rerender(<CinemaHeroBanner cinemas={[cinemas[0]!]} />);
    expect(screen.getAllByRole('img', { hidden: true })).toHaveLength(1);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
