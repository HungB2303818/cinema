import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ShowtimeDateStrip } from '@/features/showtimes/components/ShowtimeDateStrip';

describe('ShowtimeDateStrip', () => {
  it('shows 7 consecutive days with month, weekday and selected date', () => {
    const onSelect = vi.fn();
    render(<ShowtimeDateStrip today="2026-11-05" selectedDate="2026-11-05" onSelect={onSelect} />);
    const strip = screen.getByRole('group', { name: 'Chọn ngày chiếu' });
    expect(within(strip).getAllByRole('button')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Chọn ngày 11/11/2026' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chọn ngày 12/11/2026' })).not.toBeInTheDocument();
    const selected = screen.getByRole('button', { name: 'Chọn ngày 05/11/2026' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(within(selected).getByText('11')).toBeInTheDocument();
    expect(within(selected).getByText('Thu')).toBeInTheDocument();
    expect(within(selected).getByText('05')).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Chọn ngày 06/11/2026' });
    expect(next).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(next);
    expect(onSelect).toHaveBeenCalledWith('2026-11-06');
  });

  it('handles year rollover using calendar dates regardless of machine timezone', () => {
    render(<ShowtimeDateStrip today="2026-12-30" selectedDate="2027-01-01" onSelect={vi.fn()} />);
    const selected = screen.getByRole('button', { name: 'Chọn ngày 01/01/2027' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(within(selected).getByText('Fri')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chọn ngày 30/12/2026' })).toBeInTheDocument();
  });

  it('always shows the seven days starting today even for an older shared URL', () => {
    render(<ShowtimeDateStrip today="2026-11-05" selectedDate="2026-10-30" onSelect={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Chọn ngày 30/10/2026' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chọn ngày 05/11/2026' })).toBeInTheDocument();
  });
});
