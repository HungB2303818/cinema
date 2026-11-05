import { useEffect, useState } from 'react';

/**
 * Returns current Date and triggers re-render every intervalMs milliseconds,
 * allowing live updates of time-dependent UI such as booking cutoffs.
 */
export function useCurrentTime(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
