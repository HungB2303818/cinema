import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Grid, Plus, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import {
  useAdminSeats,
  useCreateSeats,
  useUpdateSeat,
  type SeatResponse,
  type SeatType,
  type PhysicalSeatStatus,
  type SeatRequest,
} from '@/features/cinemas';
import {
  Button,
  Input,
  Modal,
  AlertMessage,
  LoadingSpinner,
  EmptyState,
} from '@/shared/components/ui';
import type { ApiError } from '@/shared/types/api.types';
import { ApiErrorResponse } from '@/shared/api/http-client';

export const AdminSeatsPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const numericRoomId = roomId ? parseInt(roomId, 10) : 0;

  // Queries & Mutations
  const {
    data: seats = [],
    isLoading,
    isError,
    refetch,
  } = useAdminSeats(numericRoomId);

  const createSeatsMutation = useCreateSeats(numericRoomId);
  const updateSeatMutation = useUpdateSeat(numericRoomId);

  // Edit single seat modal
  const [editingSeat, setEditingSeat] = useState<SeatResponse | null>(null);
  const [editRow, setEditRow] = useState('');
  const [editNumber, setEditNumber] = useState(1);
  const [editType, setEditType] = useState<SeatType>('STANDARD');
  const [editStatus, setEditStatus] = useState<PhysicalSeatStatus>('ACTIVE');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Batch modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchStartRow, setBatchStartRow] = useState('A');
  const [batchEndRow, setBatchEndRow] = useState('E');
  const [batchSeatsPerRow, setBatchSeatsPerRow] = useState(10);
  const [batchVipRows, setBatchVipRows] = useState('D, E');
  const [batchStatus, setBatchStatus] = useState<PhysicalSeatStatus>('ACTIVE');
  const [batchError, setBatchError] = useState<string | null>(null);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Group seats by row for visual grid
  const seatsByRow = useMemo(() => {
    const map = new Map<string, SeatResponse[]>();
    for (const seat of seats) {
      const list = map.get(seat.seatRow) || [];
      list.push(seat);
      map.set(seat.seatRow, list);
    }
    // Sort rows alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  // Statistics
  const stats = useMemo(() => {
    let standard = 0;
    let vip = 0;
    let active = 0;
    let maintenance = 0;
    for (const s of seats) {
      if (s.seatType === 'VIP') vip++;
      else standard++;
      if (s.status === 'ACTIVE') active++;
      else maintenance++;
    }
    return { total: seats.length, standard, vip, active, maintenance };
  }, [seats]);

  // Generate batch preview
  const batchPreview = useMemo(() => {
    const startChar = (batchStartRow.trim().toUpperCase() || 'A').charCodeAt(0);
    const endChar = (batchEndRow.trim().toUpperCase() || 'A').charCodeAt(0);

    if (startChar < 65 || startChar > 90 || endChar < 65 || endChar > 90 || startChar > endChar) {
      return { list: [], error: 'Hàng bắt đầu và kết thúc phải từ A đến Z (bắt đầu <= kết thúc).' };
    }
    if (batchSeatsPerRow < 1 || batchSeatsPerRow > 100) {
      return { list: [], error: 'Số ghế mỗi hàng phải từ 1 đến 100.' };
    }

    const vipSet = new Set(
      batchVipRows
        .toUpperCase()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );

    const generated: SeatRequest[] = [];
    for (let c = startChar; c <= endChar; c++) {
      const row = String.fromCharCode(c);
      const isVip = vipSet.has(row);
      for (let num = 1; num <= batchSeatsPerRow; num++) {
        generated.push({
          seatRow: row,
          seatNumber: num,
          seatType: isVip ? 'VIP' : 'STANDARD',
          status: batchStatus,
        });
      }
    }

    if (generated.length > 1000) {
      return { list: [], error: `Số lượng ghế tạo (${generated.length}) vượt quá giới hạn tối đa 1000 ghế/batch.` };
    }

    return { list: generated, error: null };
  }, [batchStartRow, batchEndRow, batchSeatsPerRow, batchVipRows, batchStatus]);

  // Handle single seat edit
  const openEditModal = (seat: SeatResponse) => {
    setEditingSeat(seat);
    setEditRow(seat.seatRow);
    setEditNumber(seat.seatNumber);
    setEditType(seat.seatType);
    setEditStatus(seat.status);
    setEditError(null);
  };

  const closeEditModal = () => {
    if (isUpdating) return;
    setEditingSeat(null);
    setEditError(null);
  };

  const handleUpdateSeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeat || isUpdating) return;

    const rowNormalized = editRow.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(rowNormalized)) {
      setEditError('Hàng ghế gồm 1–5 chữ cái A–Z.');
      return;
    }
    if (editNumber < 1 || editNumber > 65535) {
      setEditError('Số ghế phải là số nguyên từ 1 đến 65535.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      await updateSeatMutation.mutateAsync({
        seatId: editingSeat.id,
        payload: {
          seatRow: rowNormalized,
          seatNumber: editNumber,
          seatType: editType,
          status: editStatus,
        },
      });
      closeEditModal();
    } catch (err: unknown) {
      let code: string | undefined;
      let message: string | undefined;

      if (err instanceof ApiErrorResponse) {
        code = err.code;
        message = err.message;
      } else {
        const apiErr = err as { response?: { data?: ApiError } };
        code = apiErr.response?.data?.code;
        message = apiErr.response?.data?.message;
      }

      if (code === 'RESOURCE_STATE_CONFLICT') {
        setEditError(
          message || 'Phòng đã có suất chiếu; không thể thay đổi cấu hình ghế vật lý theo quy định MVP.'
        );
      } else if (code === 'DUPLICATE_RESOURCE') {
        setEditError('Vị trí ghế này đã tồn tại trong phòng.');
      } else {
        setEditError(message || 'Không thể cập nhật ghế. Vui lòng thử lại.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle batch create
  const handleBatchSubmit = async () => {
    if (isCreatingBatch || batchPreview.error || batchPreview.list.length === 0) return;

    setIsCreatingBatch(true);
    setBatchError(null);

    try {
      await createSeatsMutation.mutateAsync({
        seats: batchPreview.list,
      });
      setIsBatchModalOpen(false);
    } catch (err: unknown) {
      let code: string | undefined;
      let message: string | undefined;

      if (err instanceof ApiErrorResponse) {
        code = err.code;
        message = err.message;
      } else {
        const apiErr = err as { response?: { data?: ApiError } };
        code = apiErr.response?.data?.code;
        message = apiErr.response?.data?.message;
      }

      if (code === 'RESOURCE_STATE_CONFLICT') {
        setBatchError(
          message || 'Phòng đã có suất chiếu; không thể khởi tạo hoặc thêm ghế mới theo quy định MVP.'
        );
      } else if (code === 'DUPLICATE_RESOURCE') {
        setBatchError('Một hoặc nhiều vị trí ghế bị trùng lặp với ghế đã có trong phòng.');
      } else {
        setBatchError(message || 'Không thể tạo batch ghế. Vui lòng kiểm tra lại dữ liệu.');
      }
    } finally {
      setIsCreatingBatch(false);
    }
  };

  if (!numericRoomId) {
    return (
      <div className="py-12">
        <AlertMessage variant="error">Mã phòng chiếu không hợp lệ.</AlertMessage>
        <Link to="/admin/rooms" className="text-xs text-[#e6e2c1] hover:underline mt-4 inline-block">
          &larr; Quay lại danh sách phòng
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-[#20232e] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
            <Link to="/admin/rooms" className="hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Danh sách phòng chiếu</span>
            </Link>
            <span>/</span>
            <span className="text-[#e6e2c1] font-semibold">Phòng #{numericRoomId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span>Sơ đồ Ghế Vật Lý</span>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#181a24] border border-[#2b2f3e] text-zinc-300">
              Phòng #{numericRoomId}
            </span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Cấu hình loại ghế (STANDARD / VIP) và trạng thái bảo trì (ACTIVE / MAINTENANCE)
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setBatchError(null);
              setIsBatchModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Khởi tạo loạt ghế (Batch)</span>
          </Button>

          <Link
            to={`/admin/showtimes/new?roomId=${numericRoomId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#181a24] hover:bg-[#252836] text-sky-400 text-sm font-semibold rounded-full border border-[#2b2f3e] transition-colors"
          >
            <span>Tạo suất chiếu</span>
          </Link>
        </div>
      </div>

      {/* Business rule banner */}
      <div className="bg-[#13151d] border border-amber-500/30 rounded-xl p-4 flex items-start gap-3.5 text-xs text-amber-200/90">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">Quy tắc ghế vật lý vs. Tồn kho suất chiếu:</p>
          <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
            <li>
              <strong>Ghế vật lý:</strong> Trạng thái gồm <code>ACTIVE</code> (hoạt động) và <code>MAINTENANCE</code> (bảo trì). Khi tạo suất chiếu, backend chỉ tạo tồn kho (inventory) cho các ghế vật lý ACTIVE.
            </li>
            <li>
              <strong>Tồn kho suất:</strong> Trạng thái gồm <code>AVAILABLE</code>, <code>HELD</code>, <code>BOOKED</code>. Đây là tồn kho riêng của từng suất chiếu, độc lập với cấu hình ghế vật lý ở màn này.
            </li>
            <li>
              <strong>Khóa cấu hình:</strong> Không thể thêm hoặc sửa ghế vật lý khi phòng đã có bất kỳ suất chiếu nào.
            </li>
          </ul>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#13151d] border border-[#242733] rounded-xl p-4">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tổng số ghế</span>
          <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-[#13151d] border border-[#242733] rounded-xl p-4">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ghế Standard</span>
          <p className="text-2xl font-black text-zinc-200 mt-1">{stats.standard}</p>
        </div>
        <div className="bg-[#13151d] border border-[#242733] rounded-xl p-4">
          <span className="text-[11px] font-bold text-amber-400/90 uppercase tracking-wider">Ghế VIP</span>
          <p className="text-2xl font-black text-[#e6e2c1] mt-1">{stats.vip}</p>
        </div>
        <div className="bg-[#13151d] border border-[#242733] rounded-xl p-4">
          <span className="text-[11px] font-bold text-emerald-400/90 uppercase tracking-wider">Hoạt động (Active)</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.active}</p>
        </div>
        <div className="bg-[#13151d] border border-[#242733] rounded-xl p-4">
          <span className="text-[11px] font-bold text-red-400/90 uppercase tracking-wider">Bảo trì (Maint.)</span>
          <p className="text-2xl font-black text-red-400 mt-1">{stats.maintenance}</p>
        </div>
      </div>

      {/* Seat Map Visual Canvas */}
      {isLoading ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-8 space-y-3">
          <AlertMessage variant="error">Không thể tải danh sách ghế vật lý của phòng này.</AlertMessage>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : seats.length === 0 ? (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-12">
          <EmptyState
            icon={Grid}
            title="Chưa có ghế vật lý nào trong phòng"
            description="Phòng chiếu này chưa được khởi tạo sơ đồ ghế. Hãy dùng công cụ 'Khởi tạo loạt ghế (Batch)' để cấu hình nhanh các hàng ghế."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setBatchError(null);
                  setIsBatchModalOpen(true);
                }}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Khởi tạo loạt ghế ngay
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40 space-y-8">
          {/* Cinema Screen Simulator */}
          <div className="space-y-2 max-w-xl mx-auto">
            <div className="h-2 w-full bg-gradient-to-r from-transparent via-[#e6e2c1] to-transparent rounded-full opacity-80 shadow-[0_0_20px_rgba(230,226,193,0.5)]" />
            <p className="text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
              MÀN CHIẾU (SCREEN)
            </p>
          </div>

          {/* Seat Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-300 pt-2 border-b border-[#20232e] pb-6">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-[#252836] border border-[#3b4055] inline-block shadow-sm" />
              <span>Standard (Hoạt động)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-[#e6e2c1] text-black font-bold text-[10px] flex items-center justify-center shadow-sm">
                VIP
              </span>
              <span>VIP (Hoạt động)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-red-950/60 border border-red-500/50 inline-block shadow-sm" />
              <span>Bảo trì (Maintenance)</span>
            </div>
          </div>

          {/* Interactive Seat Rows */}
          <div className="overflow-x-auto pb-4">
            <div className="min-w-max mx-auto space-y-3 flex flex-col items-center">
              {seatsByRow.map(([rowName, rowSeats]) => (
                <div key={rowName} className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-xs text-zinc-400 font-mono">
                    {rowName}
                  </span>

                  <div className="flex items-center gap-2">
                    {rowSeats.map((seat) => {
                      const isVip = seat.seatType === 'VIP';
                      const isMaint = seat.status === 'MAINTENANCE';

                      let seatClass = 'bg-[#252836] text-zinc-200 border-[#383d52] hover:border-[#e6e2c1] hover:scale-105';
                      if (isMaint) {
                        seatClass = 'bg-red-950/60 text-red-300 border-red-500/50 hover:border-red-400';
                      } else if (isVip) {
                        seatClass = 'bg-[#e6e2c1] text-black font-bold border-[#e6e2c1] hover:brightness-110 shadow-sm hover:scale-105';
                      }

                      return (
                        <button
                          key={seat.id}
                          type="button"
                          onClick={() => openEditModal(seat)}
                          className={`w-9 h-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${seatClass}`}
                          title={`${seat.label} - ${seat.seatType} - ${seat.status} (Bấm để sửa)`}
                        >
                          {seat.seatNumber}
                        </button>
                      );
                    })}
                  </div>

                  <span className="w-6 text-center font-bold text-xs text-zinc-400 font-mono">
                    {rowName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-zinc-500 italic">
            * Bấm vào từng ghế trên sơ đồ để chỉnh sửa loại ghế hoặc chuyển đổi trạng thái bảo trì.
          </p>
        </div>
      )}

      {/* Modal Edit Single Seat */}
      <Modal
        isOpen={!!editingSeat}
        onClose={closeEditModal}
        title={`Chỉnh sửa ghế: ${editingSeat?.label || ''}`}
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateSeatSubmit} className="space-y-4">
          {editError && <AlertMessage variant="error">{editError}</AlertMessage>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editRow" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Hàng ghế (A-Z)
              </label>
              <Input
                id="editRow"
                type="text"
                value={editRow}
                onChange={(e) => setEditRow(e.target.value.toUpperCase())}
                maxLength={5}
                required
                disabled={isUpdating}
              />
            </div>
            <div>
              <label htmlFor="editNumber" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Số ghế
              </label>
              <Input
                id="editNumber"
                type="number"
                min={1}
                max={65535}
                value={editNumber}
                onChange={(e) => setEditNumber(parseInt(e.target.value, 10) || 1)}
                required
                disabled={isUpdating}
              />
            </div>
          </div>

          <div>
            <label htmlFor="editType" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Loại ghế
            </label>
            <select
              id="editType"
              value={editType}
              onChange={(e) => setEditType(e.target.value as SeatType)}
              disabled={isUpdating}
              className="w-full px-4 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
            >
              <option value="STANDARD">STANDARD — Ghế tiêu chuẩn</option>
              <option value="VIP">VIP — Ghế VIP (áp dụng phụ thu khi lên lịch)</option>
            </select>
          </div>

          <div>
            <label htmlFor="editStatus" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Trạng thái vật lý
            </label>
            <select
              id="editStatus"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as PhysicalSeatStatus)}
              disabled={isUpdating}
              className="w-full px-4 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
            >
              <option value="ACTIVE">ACTIVE — Hoạt động bình thường</option>
              <option value="MAINTENANCE">MAINTENANCE — Tạm ngưng do bảo trì</option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1">
              Ghế bảo trì sẽ không được tạo tồn kho bán vé khi lên lịch chiếu mới.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242733]">
            <Button
              type="button"
              variant="outline"
              onClick={closeEditModal}
              disabled={isUpdating}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isUpdating}
            >
              {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Batch Create Seats */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => {
          if (!isCreatingBatch) setIsBatchModalOpen(false);
        }}
        title="Khởi tạo loạt ghế (Batch) tự động"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {batchError && <AlertMessage variant="error">{batchError}</AlertMessage>}

          <p className="text-xs text-zinc-400">
            Công cụ này hỗ trợ khởi tạo nhanh nhiều hàng ghế cùng lúc. Toàn bộ danh sách sẽ được gửi trong <strong>1 request duy nhất (atomic)</strong>. Nếu có bất kỳ ghế nào bị trùng hoặc phòng đã có suất chiếu, toàn bộ yêu cầu sẽ bị hủy bỏ an toàn.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="batchStartRow" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Từ hàng
              </label>
              <Input
                id="batchStartRow"
                type="text"
                value={batchStartRow}
                onChange={(e) => setBatchStartRow(e.target.value.toUpperCase())}
                maxLength={1}
                placeholder="A"
                disabled={isCreatingBatch}
              />
            </div>
            <div>
              <label htmlFor="batchEndRow" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Đến hàng
              </label>
              <Input
                id="batchEndRow"
                type="text"
                value={batchEndRow}
                onChange={(e) => setBatchEndRow(e.target.value.toUpperCase())}
                maxLength={1}
                placeholder="E"
                disabled={isCreatingBatch}
              />
            </div>
            <div>
              <label htmlFor="batchSeatsPerRow" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Số ghế / hàng
              </label>
              <Input
                id="batchSeatsPerRow"
                type="number"
                min={1}
                max={50}
                value={batchSeatsPerRow}
                onChange={(e) => setBatchSeatsPerRow(parseInt(e.target.value, 10) || 1)}
                disabled={isCreatingBatch}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="batchVipRows" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Các hàng VIP (phân tách dấu phẩy)
              </label>
              <Input
                id="batchVipRows"
                type="text"
                value={batchVipRows}
                onChange={(e) => setBatchVipRows(e.target.value.toUpperCase())}
                placeholder="Ví dụ: D, E, F"
                disabled={isCreatingBatch}
              />
              <p className="text-[11px] text-zinc-500 mt-1">Các hàng còn lại sẽ là STANDARD.</p>
            </div>

            <div>
              <label htmlFor="batchStatus" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Trạng thái mặc định
              </label>
              <select
                id="batchStatus"
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.target.value as PhysicalSeatStatus)}
                disabled={isCreatingBatch}
                className="w-full px-4 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
              >
                <option value="ACTIVE">ACTIVE — Hoạt động</option>
                <option value="MAINTENANCE">MAINTENANCE — Bảo trì</option>
              </select>
            </div>
          </div>

          {/* Preview Box */}
          <div className="bg-[#090a0f] border border-[#252836] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#e6e2c1]" />
                Xem trước danh sách tạo ({batchPreview.list.length} ghế):
              </span>
              {batchPreview.error ? (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {batchPreview.error}
                </span>
              ) : (
                <span className="text-emerald-400">Hợp lệ</span>
              )}
            </div>

            {batchPreview.list.length > 0 && !batchPreview.error && (
              <div className="max-h-36 overflow-y-auto pr-2 space-y-1 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  {batchPreview.list.slice(0, 80).map((s, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        s.seatType === 'VIP'
                          ? 'bg-[#e6e2c1] text-black font-bold'
                          : 'bg-[#181a24] text-zinc-300 border border-[#292c3c]'
                      }`}
                    >
                      {s.seatRow}{s.seatNumber}
                    </span>
                  ))}
                  {batchPreview.list.length > 80 && (
                    <span className="px-2 py-0.5 text-zinc-500 text-[11px]">
                      + {batchPreview.list.length - 80} ghế nữa...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242733]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBatchModalOpen(false)}
              disabled={isCreatingBatch}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleBatchSubmit}
              disabled={isCreatingBatch || !!batchPreview.error || batchPreview.list.length === 0}
            >
              {isCreatingBatch
                ? 'Đang khởi tạo...'
                : `Xác nhận tạo ${batchPreview.list.length} ghế`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
