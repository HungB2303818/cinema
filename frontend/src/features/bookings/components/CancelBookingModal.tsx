import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { useCancelBooking } from '../hooks/useBookings';
import { clearBookingIntent } from '../utils/booking-intent';
import { useAuth } from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import type { BookingCancelResponse } from '../types/booking.types';

export interface CancelBookingModalProps {
  isOpen: boolean;
  booking: {
    bookingId: number;
    bookingCode: string;
    movieTitle?: string;
  } | null;
  onClose: () => void;
  onSuccess?: (result: BookingCancelResponse) => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  isOpen,
  booking,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const cancelMutation = useCancelBooking();
  const isCancellingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Reset error when modal opens/closes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setErrorMessage(null);
  }

  const handleClose = React.useCallback(() => {
    isCancellingRef.current = false;
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !cancelMutation.isPending) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cancelMutation.isPending, handleClose]);

  if (!isOpen || !booking) return null;

  const handleConfirmCancel = async () => {
    // Synchronous double-click guard
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;
    setErrorMessage(null);

    try {
      const response = await cancelMutation.mutateAsync(booking.bookingId);

      // Clean up local session intent for this user if matching
      if (user?.id) {
        clearBookingIntent(user.id);
      }

      onSuccess?.(response);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiErrorResponse) {
        const { code, status } = err;
        if (code === 'BOOKING_EXPIRED' || status === 409 && code === 'BOOKING_EXPIRED') {
          setErrorMessage(
            'Đơn đặt vé đã hết thời hạn giữ ghế. Ghế đã được hệ thống tự động giải phóng.'
          );
        } else if (code === 'BOOKING_STATE_CONFLICT') {
          setErrorMessage(
            'Không thể hủy đơn: Đơn hàng đã thay đổi trạng thái (ví dụ: đã thanh toán thành công hoặc đã bị hủy trước đó).'
          );
        } else if (!status || status >= 500 || code === 'NETWORK_ERROR') {
          setErrorMessage(
            'Chưa xác định kết quả hủy do máy chủ phản hồi chậm hoặc lỗi mạng. Vui lòng bấm thử lại để đối soát.'
          );
        } else {
          setErrorMessage(err.message || 'Không thể hủy đơn đặt vé.');
        }
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Đã có lỗi xảy ra khi gửi yêu cầu hủy đơn.'
        );
      }
    } finally {
      isCancellingRef.current = false;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div className="bg-[#13151d] border border-[#242733] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#20232e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 id="cancel-modal-title" className="text-lg font-bold text-white">
              Xác nhận hủy giữ chỗ
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={cancelMutation.isPending}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border-none cursor-pointer disabled:opacity-50"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-zinc-300">
          <p>
            Bạn có chắc chắn muốn hủy đơn đặt vé{' '}
            <strong className="text-white font-mono">{booking.bookingCode}</strong>
            {booking.movieTitle ? ` cho phim "${booking.movieTitle}"` : ''}?
          </p>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1">
            <p className="font-bold text-amber-300">Lưu ý quan trọng:</p>
            <p>
              • Thao tác này chỉ áp dụng cho đơn đang ở trạng thái <strong>giữ chỗ tạm thời (PENDING)</strong>.
            </p>
            <p>
              • Toàn bộ ghế trong đơn sẽ được <strong>giải phóng ngay lập tức</strong> cho người khác có thể đặt.
            </p>
            <p className="italic text-amber-300/80">
              * Đây không phải là tính năng hoàn tiền sau khi vé đã được thanh toán.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={cancelMutation.isPending}
            className="flex-1"
          >
            Giữ lại đơn
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleConfirmCancel}
            disabled={cancelMutation.isPending}
            className="flex-1 gap-1.5"
          >
            {cancelMutation.isPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang hủy...</span>
              </>
            ) : (
              <span>Xác nhận hủy</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
