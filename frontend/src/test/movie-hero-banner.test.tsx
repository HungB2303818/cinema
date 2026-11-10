import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
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
});
