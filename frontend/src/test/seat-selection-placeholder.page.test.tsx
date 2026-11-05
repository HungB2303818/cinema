import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { SeatSelectionPlaceholderPage } from '@/pages/SeatSelectionPlaceholderPage';
import { renderWithProviders } from './test-utils';
import { Routes, Route } from 'react-router-dom';

describe('SeatSelectionPlaceholderPage (FE-04 Connection Point)', () => {
  it('reads showtimeId from route parameters and informs user that seat selection is part of FE-04', () => {
    renderWithProviders(
      <Routes>
        <Route path="/showtimes/:showtimeId/seats" element={<SeatSelectionPlaceholderPage />} />
      </Routes>,
      { initialEntries: ['/showtimes/105/seats'] }
    );

    expect(screen.getByText('Chức năng chọn ghế chưa được triển khai')).toBeInTheDocument();
    expect(screen.getByText(/Suất chiếu #105/i)).toBeInTheDocument();
    expect(screen.getAllByText(/FE-04/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Quay lại trang trước')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem lịch chiếu khác/i })).toHaveAttribute(
      'href',
      '/showtimes'
    );
  });
});
