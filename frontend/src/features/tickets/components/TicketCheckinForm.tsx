import React, { useState, useRef, useEffect } from 'react';
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Film,
  Tv,
  Armchair,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { formatDateTime } from '@/shared/utils/format';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { useAuth } from '@/features/auth';
import { useCheckInTicket } from '../hooks/useCheckInTicket';
import type { CheckinResponse } from '../types/ticket.types';

interface ErrorInfo {
  title: string;
  message: string;
  isIndeterminate?: boolean;
}

export const TicketCheckinForm: React.FC = () => {
  const { user } = useAuth();
  const checkInMutation = useCheckInTicket();

  const [ticketCode, setTicketCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<CheckinResponse | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // Ref to protect against synchronous double clicks before re-render
  const isSubmittingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Active session tracking to isolate requests and clear on logout / account switch
  const activeUserIdRef = useRef(user?.id);
  useEffect(() => {
    if (activeUserIdRef.current !== user?.id) {
      activeUserIdRef.current = user?.id;
      setTicketCode('');
      setFieldError(null);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setSuccessResult(null);
      setErrorInfo(null);
    }
  }, [user?.id]);

  // Handle typing or pasting without case-folding or trimming
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTicketCode(value);

    // Clear previous error if field becomes valid length
    if (fieldError) {
      if (value.trim().length > 0 && value.length <= 48) {
        setFieldError(null);
      }
    }

    // When modifying input, dissociate previous results to avoid confusion
    if (successResult) {
      setSuccessResult(null);
    }
    if (errorInfo) {
      setErrorInfo(null);
    }
  };

  const executeCheckin = async (codeToSubmit: string) => {
    // Client-side validations
    if (!codeToSubmit || codeToSubmit.length === 0 || codeToSubmit.trim().length === 0) {
      setFieldError('Mã vé không được để trống.');
      inputRef.current?.focus();
      return;
    }

    if (codeToSubmit.length > 48) {
      setFieldError('Mã vé tối đa 48 ký tự.');
      inputRef.current?.focus();
      return;
    }

    // Guard synchronous double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    setFieldError(null);
    setErrorInfo(null);
    setSuccessResult(null);

    const requestSessionUserId = user?.id;

    try {
      // Send raw code without trimming, case-folding, or truncating
      const result = await checkInMutation.mutateAsync({ ticketCode: codeToSubmit });

      // Discard response if user changed during in-flight request
      if (activeUserIdRef.current !== requestSessionUserId) return;

      setSuccessResult(result);
      setErrorInfo(null);
    } catch (err: unknown) {
      if (activeUserIdRef.current !== requestSessionUserId) return;

      // Distinguish indeterminate results (network error, timeout, 5xx) from business errors
      const isNetworkOr5xx =
        err instanceof ApiErrorResponse
          ? !err.status || err.status >= 500 || err.code === 'NETWORK_ERROR'
          : err instanceof Error && !('status' in err);

      if (isNetworkOr5xx) {
        setErrorInfo({
          title: 'Chưa xác định kết quả check-in',
          message:
            'Chưa xác định kết quả. Vé có thể đã được ghi nhận; vui lòng kiểm tra trước khi thử lại.',
          isIndeterminate: true,
        });
      } else if (err instanceof ApiErrorResponse) {
        const { code, status } = err;

        if (status === 404 || code === 'RESOURCE_NOT_FOUND') {
          setErrorInfo({
            title: 'Không tìm thấy vé',
            message: 'Không tìm thấy mã vé trong hệ thống. Vui lòng kiểm tra lại mã vé.',
          });
        } else if (status === 409 && code === 'TICKET_ALREADY_USED') {
          setErrorInfo({
            title: 'Vé đã được sử dụng',
            message: 'Vé này đã được check-in trước đó. Không thể check-in lại.',
          });
        } else if (status === 409 && code === 'BOOKING_STATE_CONFLICT') {
          setErrorInfo({
            title: 'Trạng thái vé không hợp lệ',
            message:
              'Đơn đặt vé chưa ở trạng thái hợp lệ để check-in (chưa hoàn tất thanh toán hoặc không phải CONFIRMED).',
          });
        } else if (status === 422 && code === 'CHECKIN_TIME_INVALID') {
          setErrorInfo({
            title: 'Thời gian check-in không hợp lệ',
            message:
              'Thời gian check-in không hợp lệ. Chỉ được soát vé trong khoảng từ 30 phút trước giờ chiếu đến khi kết thúc suất chiếu, và suất chiếu không bị hủy.',
          });
        } else if (status === 422 && code === 'SEAT_NOT_IN_ROOM') {
          setErrorInfo({
            title: 'Dữ liệu vé không hợp lệ',
            message: 'Dữ liệu ghế hoặc phòng chiếu không khớp với suất chiếu.',
          });
        } else if (status === 400 || code === 'VALIDATION_ERROR') {
          setErrorInfo({
            title: 'Dữ liệu không hợp lệ',
            message: err.message || 'Dữ liệu mã vé không hợp lệ.',
          });
        } else if (status === 401 || code === 'UNAUTHENTICATED') {
          setErrorInfo({
            title: 'Hết phiên đăng nhập',
            message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.',
          });
        } else if (status === 403 || code === 'ACCESS_DENIED') {
          setErrorInfo({
            title: 'Không có quyền soát vé',
            message: 'Bạn không có quyền thực hiện soát vé. Yêu cầu vai trò Nhân viên hoặc Quản trị viên.',
          });
        } else {
          setErrorInfo({
            title: 'Lỗi soát vé',
            message: err.message || 'Không thể thực hiện soát vé.',
          });
        }
      } else {
        setErrorInfo({
          title: 'Lỗi kết nối',
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.',
          isIndeterminate: true,
        });
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    executeCheckin(ticketCode);
  };

  // Next ticket / Reset action
  const handleReset = () => {
    setTicketCode('');
    setFieldError(null);
    setSuccessResult(null);
    setErrorInfo(null);
    setIsSubmitting(false);
    isSubmittingRef.current = false;
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header card with operator info */}
      <div className="bg-[#13151d] border border-[#242733] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e6e2c1]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#20232e] pb-6 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e6e2c1]/10 border border-[#e6e2c1]/20 flex items-center justify-center text-[#e6e2c1]">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Soát vé vào rạp</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Xác thực mã vé cho khán giả trước khi vào phòng chiếu
              </p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-full bg-[#181a24] border border-[#282b3a]">
              <ShieldCheck className="w-4 h-4 text-[#e6e2c1]" />
              <span className="text-xs font-semibold text-zinc-300">{user.fullName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e6e2c1] text-black font-extrabold">
                {user.role}
              </span>
            </div>
          )}
        </div>

        {/* Check-in Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="ticket-code-input"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-300"
            >
              Mã vé
            </label>
            <div className="relative">
              <input
                id="ticket-code-input"
                ref={inputRef}
                type="text"
                name="ticketCode"
                value={ticketCode}
                onChange={handleInputChange}
                disabled={isSubmitting}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Nhập hoặc dán mã vé (ví dụ: TCK-XYZ123...)"
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? 'ticket-code-error' : 'ticket-code-helper'}
                className={`w-full px-4 py-3 bg-[#0a0b10] border rounded-2xl text-zinc-100 placeholder-zinc-500 text-sm font-mono transition-all focus:outline-none ${
                  fieldError
                    ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-400/40'
                    : 'border-[#262934] focus:border-[#e6e2c1] focus:ring-2 focus:ring-[#e6e2c1]/40'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>

            {fieldError ? (
              <p
                id="ticket-code-error"
                role="alert"
                className="text-xs text-red-400 font-medium flex items-center gap-1.5 mt-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldError}</span>
              </p>
            ) : (
              <p id="ticket-code-helper" className="text-xs text-zinc-400 mt-1.5">
                Nhập hoặc dán mã vé do hệ thống cấp (tối đa 48 ký tự). Máy quét mã dạng bàn phím có thể quét trực tiếp vào ô này.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:min-w-[180px] justify-center"
            >
              {isSubmitting ? 'Đang kiểm tra...' : 'Xác nhận check-in'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleReset}
              disabled={isSubmitting}
              className="w-full sm:w-auto justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Vé tiếp theo</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Result presentation area */}
      <div aria-live="polite" aria-atomic="true" className="space-y-4">
        {/* SUCCESS RESULT */}
        {successResult && (
          <div className="bg-[#121915] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-emerald-300">Check-in thành công</h2>
                <p className="text-xs text-emerald-400/80">Vé hợp lệ và đã được ghi nhận vào hệ thống</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0a0f0d] border border-emerald-500/10">
                <Film className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Phim</div>
                  <div className="font-bold text-white text-base mt-0.5">{successResult.movieTitle}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0a0f0d] border border-emerald-500/10">
                <Tv className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Phòng chiếu</div>
                  <div className="font-bold text-white text-base mt-0.5">{successResult.roomName}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0a0f0d] border border-emerald-500/10">
                <Armchair className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Số ghế</div>
                  <div className="font-extrabold text-[#e6e2c1] text-lg mt-0.5">{successResult.seatLabel}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#0a0f0d] border border-emerald-500/10">
                <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Thời gian soát vé</div>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {formatDateTime(successResult.checkedInAt)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-emerald-500/20 flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Soát vé tiếp theo</span>
              </Button>
            </div>
          </div>
        )}

        {/* ERROR / INDETERMINATE RESULT */}
        {errorInfo && (
          <div
            role="alert"
            className={`border rounded-3xl p-6 sm:p-7 shadow-2xl animate-in fade-in-50 duration-200 ${
              errorInfo.isIndeterminate
                ? 'bg-amber-950/20 border-amber-600/40 text-amber-200'
                : 'bg-rose-950/20 border-rose-600/40 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                  errorInfo.isIndeterminate
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {errorInfo.isIndeterminate ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h3
                  className={`text-base sm:text-lg font-bold ${
                    errorInfo.isIndeterminate ? 'text-amber-300' : 'text-rose-300'
                  }`}
                >
                  {errorInfo.title}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed">{errorInfo.message}</p>

                {errorInfo.isIndeterminate && (
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 text-xs text-amber-300/90 space-y-2 mt-3">
                    <p>
                      <strong>Cảnh báo thử lại:</strong> Nếu thử lại, bạn có thể nhận thông báo{' '}
                      <em>&quot;Vé này đã được check-in trước đó&quot;</em> nếu máy chủ đã kịp ghi nhận lượt soát vé ở yêu cầu trước.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => executeCheckin(ticketCode)}
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                        className="text-xs"
                      >
                        Thử lại check-in với mã này
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={isSubmitting}
                        className="text-xs"
                      >
                        Hủy &amp; Làm mới
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
