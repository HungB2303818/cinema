import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { RankRosetteBadge } from '../features/movies/components/RankRosetteBadge';
import { MovieCard } from '../features/movies/components/MovieCard';
import type { Movie } from '../features/movies/types/movie.types';

describe('RankRosetteBadge', () => {
  it('renders Rank 1 with red theme and label', () => {
    const { container } = render(<RankRosetteBadge rank={1} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Xếp hạng 1"]')).toBeInTheDocument();
  });

  it('renders Rank 2 with orange theme and label', () => {
    const { container } = render(<RankRosetteBadge rank={2} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Xếp hạng 2"]')).toBeInTheDocument();
  });

  it('renders Rank 3 with blue theme and label', () => {
    const { container } = render(<RankRosetteBadge rank={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Xếp hạng 3"]')).toBeInTheDocument();
  });
});

describe('MovieCard without yellow border and with rank badge', () => {
  const mockMovie: Movie = {
    id: 1,
    title: 'Godzilla Trừ Không',
    description: 'Chiến tranh đã đưa Nhật Bản về số không',
    durationMinutes: 135,
    genre: 'Hành Động',
    ageRating: 'T16',
    releaseDate: '2026-11-17',
    posterUrl: 'https://example.com/poster.jpg',
    status: 'SHOWING',
    isFeatured: true,
  };

  it('renders RankRosetteBadge and has NO yellow ring/border on article', () => {
    const { container } = render(
      <BrowserRouter>
        <MovieCard movie={mockMovie} featuredRank={1} />
      </BrowserRouter>
    );

    // Verify badge exists with rank 1
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Xếp hạng 1"]')).toBeInTheDocument();

    // Verify yellow border ring is NOT present
    const article = container.querySelector('article');
    expect(article).toBeInTheDocument();
    expect(article?.className).not.toContain('ring-');
    expect(article?.className).not.toContain('#e6e2c1');
  });
});
