import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, authApi, useAuth } from '@/features/auth';
import { renderWithProviders } from './test-utils';

const account = { id: 3, fullName: 'Name', email: 'name@example.com', role: 'CUSTOMER', status: 'ACTIVE' } as const;

function SessionUpdate({ preserveBookingState }: { preserveBookingState: boolean }) {
  const { user, isLoading, login } = useAuth();
  if (isLoading) return <p>Loading</p>;
  return <>
    <p>{user?.fullName}</p>
    <button onClick={() => login('new-token', { ...account, fullName: 'Updated Name' }, { preserveBookingState })}>Update session</button>
  </>;
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('token', 'old-token');
  sessionStorage.setItem('cinema_booking_intent_123', 'booking');
  sessionStorage.setItem('cinema_payment_attempt_123', 'payment');
  vi.spyOn(authApi, 'getMe').mockResolvedValue(account);
});

describe('Auth session updates', () => {
  it.each([true, false])('preserveBookingState=%s updates credentials with the requested booking behavior', async (preserveBookingState) => {
    const user = userEvent.setup();
    renderWithProviders(<AuthProvider><SessionUpdate preserveBookingState={preserveBookingState} /></AuthProvider>);
    await user.click(await screen.findByRole('button', { name: 'Update session' }));
    expect(screen.getByText('Updated Name')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('new-token');
    expect(sessionStorage.getItem('cinema_booking_intent_123')).toBe(preserveBookingState ? 'booking' : null);
    expect(sessionStorage.getItem('cinema_payment_attempt_123')).toBe(preserveBookingState ? 'payment' : null);
  });
});
