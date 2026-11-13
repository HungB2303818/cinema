import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { MovieHeroBanner } from '@/features/movies/components/MovieHeroBanner';
import { renderWithProviders } from './test-utils';

describe('MovieHeroBanner', () => {
  it('renders minimalist Dune 3 title, concise slogan at bottom, and full-width background image with fetchpriority=high', () => {
    renderWithProviders(<MovieHeroBanner />);

    // Minimalist Title
    expect(screen.getByText(/DUNE: HÀNH TINH CÁT/i)).toBeInTheDocument();
    expect(screen.getByText(/PHẦN BA/i)).toBeInTheDocument();

    // Concise Slogan / Synopsis
    expect(
      screen.getByText(/Paul Atreides hợp lực cùng Chani và tộc người Fremen/i)
    ).toBeInTheDocument();

    // Verify minimalism: No buttons
    expect(screen.queryByRole('button', { name: /Đặt vé ngay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xem trailer/i })).not.toBeInTheDocument();

    // Verify minimalism: No format, age rating, or clutter
    expect(screen.queryByText('T16')).not.toBeInTheDocument();
    expect(screen.queryByText(/IMAX/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/165 phút/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Denis Villeneuve/i)).not.toBeInTheDocument();

    // Full-width Image with high priority for LCP
    const img = screen.getByRole('img', { name: /Paul Atreides và Chani/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/banners/dune_fullwidth_seamless.jpg');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('switches between all three film banners using arrows and slide selectors', () => {
    renderWithProviders(<MovieHeroBanner />);

    fireEvent.click(screen.getByRole('button', { name: 'Banner tiếp theo' }));
    expect(screen.getByRole('heading', { name: /AVENGERS: DOOMSDAY/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Doctor Doom/i })).toHaveAttribute('src', '/banners/avengers_banner.webp');
    expect(screen.getByRole('button', { name: 'Xem banner Avengers: Doomsday' })).toHaveAttribute('aria-current', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Banner tiếp theo' }));
    expect(screen.getByRole('heading', { name: /GODZILLA MINUS ZERO/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Godzilla trồi lên từ biển/i })).toHaveAttribute('src', '/banners/godzilla_banner.avif');

    fireEvent.click(screen.getByRole('button', { name: 'Banner tiếp theo' }));
    expect(screen.getByRole('heading', { name: /DUNE: HÀNH TINH CÁT/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Banner trước' }));
    expect(screen.getByRole('heading', { name: /GODZILLA MINUS ZERO/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem banner Avengers: Doomsday' }));
    expect(screen.getByRole('heading', { name: /AVENGERS: DOOMSDAY/i })).toBeInTheDocument();
  });

  it('advances automatically, but pauses while hovered', () => {
    vi.useFakeTimers();
    try {
      const { container, unmount } = renderWithProviders(<MovieHeroBanner />);
      act(() => vi.advanceTimersByTime(6000));
      expect(screen.getByRole('heading', { name: /AVENGERS: DOOMSDAY/i })).toBeInTheDocument();

      fireEvent.mouseEnter(container.querySelector('section')!);
      act(() => vi.advanceTimersByTime(12000));
      expect(screen.getByRole('heading', { name: /AVENGERS: DOOMSDAY/i })).toBeInTheDocument();
      fireEvent.mouseLeave(container.querySelector('section')!);
      act(() => vi.advanceTimersByTime(6000));
      expect(screen.getByRole('heading', { name: /GODZILLA MINUS ZERO/i })).toBeInTheDocument();
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not rotate automatically when reduced motion is preferred, but still allows manual navigation', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.useFakeTimers();
    try {
      const { unmount } = renderWithProviders(<MovieHeroBanner />);
      act(() => vi.advanceTimersByTime(12000));
      expect(screen.getByRole('heading', { name: /DUNE: HÀNH TINH CÁT/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Banner tiếp theo' }));
      expect(screen.getByRole('heading', { name: /AVENGERS: DOOMSDAY/i })).toBeInTheDocument();
      unmount();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
