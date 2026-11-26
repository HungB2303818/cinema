import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { AlertMessage, Button, Modal, StatusBadge } from '@/shared/components/ui';
import { formatDate, getVietnamDateString } from '@/shared/utils/format';
import { useGenerateSchedulePlan } from '../hooks/useGenerateSchedulePlan';
import { daysBetweenInclusive, defaultGenerationRange } from '../utils/schedule-plan.utils';
import type { GenerateScheduleRequest, GenerationSummary, SchedulePlanSummary } from '../types/schedule-plan.types';

export interface GenerateScheduleModalProps {
  plan: SchedulePlanSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onViewLogs: (planId: number) => void;
}

export const GenerateScheduleModal: React.FC<GenerateScheduleModalProps> = ({
  plan,
  isOpen,
  onClose,
  onViewLogs,
}) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [summary, setSummary] = useState<GenerationSummary | null>(null);

  const generateMutation = useGenerateSchedulePlan(plan?.id);

  useEffect(() => {
    if (!isOpen || !plan) return;
    const range = defaultGenerationRange(plan.effectiveFrom, plan.effectiveTo);
    setFrom(range.from);
    setTo(range.to);
    setRangeError(range.error);
    setError(null);
    setSummary(null);
    generateMutation.reset();
    // Reset once per opened plan; mutation identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, plan?.id]);

  if (!plan) return null;

  const validate = (): string | null => {
    if (rangeError) return rangeError;
    if (!from || !to) return 'Vui lòng chọn khoảng ngày cần sinh.';
    if (to < from) return 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.';
    const today = getVietnamDateString();
    if (from < today) return 'Ngày bắt đầu không được trước hôm nay.';
    if (from < plan.effectiveFrom || to > plan.effectiveTo) {
      return 'Khoảng ngày sinh phải nằm trong hiệu lực của kế hoạch.';
    }
    if (daysBetweenInclusive(from, to) > 31) return 'Chỉ sinh tối đa 31 ngày mỗi lần.';
    if (plan.status !== 'ACTIVE') return 'Chỉ sinh lịch cho kế hoạch đang bật.';
    return null;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const payload: GenerateScheduleRequest = { from, to };
    generateMutation.mutate(payload, {
      onSuccess: (data) => setSummary(data),
    });
  };

  const handleClose = () => {
    generateMutation.reset();
    setSummary(null);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Sinh lịch ngay" maxWidth="2xl">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-[#2b2f3e] bg-[#0c0d12] p-4">
          <CalendarClock className="w-5 h-5 text-[#e6e2c1] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{plan.name}</p>
            <p className="text-xs text-zinc-400">
              {plan.cinemaName} · {plan.roomName} · hiệu lực {formatDate(plan.effectiveFrom)} -{' '}
              {formatDate(plan.effectiveTo)}
            </p>
          </div>
        </div>

        {summary ? (
          <div className="space-y-4">
            <AlertMessage
              variant={summary.failedCount > 0 ? 'warning' : 'success'}
              title="Kết quả sinh lịch"
            >
              Đã tạo {summary.createdCount} suất, bỏ qua {summary.skippedCount} khung, lỗi{' '}
              {summary.failedCount} ngày.
            </AlertMessage>

            <div className="overflow-x-auto rounded-xl border border-[#242733]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c0d12] text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Ngày</th>
                    <th className="px-4 py-3">Kết quả</th>
                    <th className="px-4 py-3">Đã tạo</th>
                    <th className="px-4 py-3">Bỏ qua</th>
                    <th className="px-4 py-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e202a]">
                  {summary.dates.map((item) => (
                    <tr key={item.date}>
                      <td className="px-4 py-3 font-semibold text-zinc-200">{formatDate(item.date)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.outcome} />
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{item.createdCount}</td>
                      <td className="px-4 py-3 text-zinc-300">{item.skippedCount}</td>
                      <td className="px-4 py-3 text-zinc-400">{item.message || '—'}</td>
                    </tr>
                  ))}
                  {summary.dates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                        Không có ngày nào khớp lịch trong khoảng đã chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-zinc-500">
              Chỉ bổ sung khung trống, không sửa suất đã có.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button variant="outline" onClick={handleClose}>
                Đóng
              </Button>
              <Button variant="primary" onClick={() => onViewLogs(plan.id)}>
                Xem nhật ký
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="generateFrom"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                >
                  Từ ngày
                </label>
                <input
                  id="generateFrom"
                  type="date"
                  value={from}
                  min={plan.effectiveFrom}
                  max={plan.effectiveTo}
                  onChange={(event) => setFrom(event.target.value)}
                  className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="generateTo"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                >
                  Đến ngày
                </label>
                <input
                  id="generateTo"
                  type="date"
                  value={to}
                  min={plan.effectiveFrom}
                  max={plan.effectiveTo}
                  onChange={(event) => setTo(event.target.value)}
                  className="w-full px-3 py-2 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Chỉ bổ sung khung trống cho các ngày đúng thứ trong kế hoạch, không sửa suất đã có. Tối đa
              31 ngày mỗi lần.
            </p>

            {rangeError && <AlertMessage variant="error">{rangeError}</AlertMessage>}

            {(error || generateMutation.isError) && (
              <AlertMessage variant="error">
                {error || generateMutation.error?.message || 'Không thể sinh lịch.'}
              </AlertMessage>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={generateMutation.isPending}
                disabled={Boolean(rangeError)}
              >
                Sinh ngay
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
