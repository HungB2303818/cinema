import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import {
  GenerateScheduleModal,
  addDaysToDate,
  defaultGenerationRange,
  type SchedulePlanSummary,
} from '@/features/schedule-plans';
import { getVietnamDateString } from '@/shared/utils/format';
import { renderWithProviders } from './test-utils';

const today = getVietnamDateString();

const expiredPlan: SchedulePlanSummary = {
  id: 9,
  name: 'Lịch đã hết hiệu lực',
  roomId: 10,
  roomName: 'Cinema 1',
  cinemaId: 1,
  cinemaName: 'CGV Vincom Cần Thơ',
  effectiveFrom: addDaysToDate(today, -30),
  effectiveTo: addDaysToDate(today, -1),
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  openTime: '08:00',
  closeTime: '23:00',
  slotStepMinutes: 15,
  cleanupMinutes: 15,
  basePrice: 75000,
  vipSurcharge: 20000,
  status: 'ACTIVE',
  movieCount: 1,
};

describe('defaultGenerationRange', () => {
  it('mặc định hôm nay đến hôm nay + 6 cho kế hoạch đang hiệu lực', () => {
    const range = defaultGenerationRange(addDaysToDate(today, -10), addDaysToDate(today, 30));

    expect(range.error).toBeNull();
    expect(range.from).toBe(today);
    expect(range.to).toBe(addDaysToDate(today, 6));
  });

  it('bắt đầu từ ngày hiệu lực khi kế hoạch chưa tới ngày bắt đầu', () => {
    const start = addDaysToDate(today, 10);
    const range = defaultGenerationRange(start, addDaysToDate(start, 30));

    expect(range.error).toBeNull();
    expect(range.from).toBe(start);
    expect(range.to).toBe(addDaysToDate(start, 6));
  });

  it('không trả khoảng ngược khi kế hoạch đã hết hiệu lực', () => {
    const range = defaultGenerationRange(addDaysToDate(today, -30), addDaysToDate(today, -1));

    expect(range.error).not.toBeNull();
    expect(range.from <= range.to).toBe(true);
  });

  it('cắt ngày kết thúc theo hiệu lực kế hoạch', () => {
    const end = addDaysToDate(today, 2);
    const range = defaultGenerationRange(addDaysToDate(today, -10), end);

    expect(range.to).toBe(end);
  });
});

describe('GenerateScheduleModal với kế hoạch hết hiệu lực', () => {
  it('hiển thị lỗi và tắt nút sinh lịch', async () => {
    renderWithProviders(
      <GenerateScheduleModal
        plan={expiredPlan}
        isOpen
        onClose={() => undefined}
        onViewLogs={() => undefined}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Kế hoạch đã hết hiệu lực nên không thể sinh lịch.')
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Sinh ngay' })).toBeDisabled();
  });
});
