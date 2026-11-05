import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Tv, Plus, Edit2, Grid, CalendarPlus, ShieldAlert, Building2 } from 'lucide-react';
import {
  useAdminCinemas,
  useAdminRooms,
  useCreateRoom,
  useUpdateRoom,
  type RoomResponse,
  type RoomStatus,
} from '@/features/cinemas';
import {
  Button,
  Input,
  Modal,
  Pagination,
  StatusBadge,
  AlertMessage,
  LoadingSpinner,
  EmptyState,
} from '@/shared/components/ui';
import type { ApiError, FieldErrorItem } from '@/shared/types/api.types';

export const AdminRoomsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Cinema selection & pagination
  const [cinemaPage, setCinemaPage] = useState(0);
  const cinemaIdParam = searchParams.get('cinemaId');
  const selectedCinemaId = cinemaIdParam ? parseInt(cinemaIdParam, 10) : undefined;

  // Room list pagination
  const roomPage = parseInt(searchParams.get('page') || '0', 10);

  // Queries
  const {
    data: cinemasData,
    isLoading: isLoadingCinemas,
    isError: isErrorCinemas,
    refetch: refetchCinemas,
  } = useAdminCinemas(cinemaPage, 10, 'name,asc');

  const {
    data: roomsData,
    isLoading: isLoadingRooms,
    isError: isErrorRooms,
    refetch: refetchRooms,
  } = useAdminRooms(selectedCinemaId, roomPage, 10, 'id,asc');

  // Mutations
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomResponse | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('ACTIVE');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select first cinema if none selected
  useEffect(() => {
    if (!selectedCinemaId && cinemasData?.content && cinemasData.content.length > 0) {
      setSearchParams({ cinemaId: cinemasData.content[0].id.toString(), page: '0' });
    }
  }, [cinemasData, selectedCinemaId, setSearchParams]);

  const handleSelectCinema = (cinemaId: number) => {
    setSearchParams({ cinemaId: cinemaId.toString(), page: '0' });
  };

  const handleRoomPageChange = (newPageOneBased: number) => {
    if (!selectedCinemaId) return;
    setSearchParams({
      cinemaId: selectedCinemaId.toString(),
      page: (newPageOneBased - 1).toString(),
    });
  };

  const openCreateModal = () => {
    setEditingRoom(null);
    setRoomName('');
    setRoomStatus('ACTIVE');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (room: RoomResponse) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomStatus(room.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingRoom(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCinemaId || isSubmitting) return;

    const trimmedName = roomName.trim();
    if (!trimmedName) {
      setFormError('Tên phòng không được để trống.');
      return;
    }
    if (trimmedName.length > 50) {
      setFormError('Tên phòng tối đa 50 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingRoom) {
        await updateRoomMutation.mutateAsync({
          id: editingRoom.id,
          payload: {
            cinemaId: selectedCinemaId,
            name: trimmedName,
            status: roomStatus,
          },
        });
      } else {
        await createRoomMutation.mutateAsync({
          cinemaId: selectedCinemaId,
          name: trimmedName,
          status: roomStatus,
        });
      }
      closeModal();
    } catch (err: unknown) {
      const apiErr = err as {
        code?: string;
        message?: string;
        fieldErrors?: FieldErrorItem[];
        response?: { data?: ApiError };
      };
      const code = apiErr.code || apiErr.response?.data?.code;
      const message = apiErr.message || apiErr.response?.data?.message;
      const fieldErrors = apiErr.fieldErrors || apiErr.response?.data?.fieldErrors;

      if (code === 'DUPLICATE_RESOURCE') {
        setFormError('Tên phòng này đã tồn tại trong cụm rạp.');
      } else if (code === 'RESOURCE_STATE_CONFLICT') {
        setFormError(
          message || 'Phòng đã có suất chiếu; không thể thay đổi cấu hình phòng theo quy định MVP.'
        );
      } else if (fieldErrors?.length) {
        setFormError(fieldErrors.map((f: FieldErrorItem) => f.message).join(' '));
      } else {
        setFormError(message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCinema = cinemasData?.content.find((c) => c.id === selectedCinemaId);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-[#20232e] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#e6e2c1] text-sm font-bold mb-1">
            <Tv className="w-4 h-4" />
            <span>Quản trị Hạ tầng Rạp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Quản lý Phòng Chiếu</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Xem danh sách phòng chiếu theo rạp, quản lý trạng thái và sơ đồ ghế vật lý
          </p>
        </div>

        {selectedCinemaId && (
          <Button
            type="button"
            variant="primary"
            onClick={openCreateModal}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm phòng chiếu</span>
          </Button>
        )}
      </div>

      {/* Business rule banner */}
      <div className="bg-[#13151d] border border-amber-500/30 rounded-xl p-4 flex items-start gap-3.5 text-xs text-amber-200/90">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">Quy tắc bất biến quản lý phòng & ghế (MVP):</p>
          <p className="leading-relaxed">
            Hệ thống bảo vệ toàn vẹn lịch sử và inventory: <strong>Không thể đổi tên, trạng thái phòng hoặc thêm/sửa ghế vật lý</strong> khi phòng đã có bất kỳ suất chiếu nào (kể cả suất đã hủy hoặc đã hoàn tất).
          </p>
        </div>
      </div>

      {/* Cinema selector */}
      <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
            <Building2 className="w-4 h-4 text-[#e6e2c1]" />
            <span>Chọn Cụm Rạp Chiếu:</span>
          </div>
          {cinemasData && cinemasData.totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Trang rạp: {cinemaPage + 1}/{cinemasData.totalPages}</span>
              <button
                type="button"
                disabled={cinemaPage === 0}
                onClick={() => setCinemaPage((p) => Math.max(0, p - 1))}
                className="px-2 py-1 bg-[#1a1c24] hover:bg-[#252836] disabled:opacity-40 rounded text-zinc-300 font-semibold cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={cinemaPage >= cinemasData.totalPages - 1}
                onClick={() => setCinemaPage((p) => p + 1)}
                className="px-2 py-1 bg-[#1a1c24] hover:bg-[#252836] disabled:opacity-40 rounded text-zinc-300 font-semibold cursor-pointer"
              >
                Sau
              </button>
            </div>
          )}
        </div>

        {isLoadingCinemas ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : isErrorCinemas ? (
          <div className="space-y-2">
            <AlertMessage variant="error">Không thể tải danh sách cụm rạp.</AlertMessage>
            <Button variant="outline" size="sm" onClick={() => refetchCinemas()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cinemasData?.content.map((cinema) => {
              const isSelected = cinema.id === selectedCinemaId;
              return (
                <button
                  key={cinema.id}
                  type="button"
                  onClick={() => handleSelectCinema(cinema.id)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1e202a] border-[#e6e2c1] shadow-lg shadow-black/40 ring-1 ring-[#e6e2c1]'
                      : 'bg-[#0f1016] border-[#222430] hover:border-[#383c4e] hover:bg-[#161822]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold text-sm ${isSelected ? 'text-[#e6e2c1]' : 'text-white'}`}>
                      {cinema.name}
                    </span>
                    <StatusBadge status={cinema.status} size="sm" />
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-1">{cinema.address}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Room list for selected cinema */}
      {selectedCinemaId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Danh sách phòng chiếu</span>
              {currentCinema && (
                <span className="text-xs font-normal text-zinc-400">
                  — {currentCinema.name}
                </span>
              )}
            </h2>
          </div>

          {isLoadingRooms ? (
            <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : isErrorRooms ? (
            <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-8 space-y-3">
              <AlertMessage variant="error">Không thể tải danh sách phòng chiếu của rạp này.</AlertMessage>
              <Button variant="outline" size="sm" onClick={() => refetchRooms()}>
                Thử lại
              </Button>
            </div>
          ) : !roomsData?.content.length ? (
            <div className="bg-[#13151d] border border-[#242733] rounded-2xl p-8">
              <EmptyState
                icon={Tv}
                title="Chưa có phòng chiếu nào"
                description="Cụm rạp này hiện chưa có phòng chiếu. Hãy thêm phòng chiếu đầu tiên để cấu hình ghế và lịch chiếu."
                action={
                  <Button variant="primary" size="sm" onClick={openCreateModal} className="mt-2">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Thêm phòng mới
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="bg-[#13151d] border border-[#242733] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#242733] bg-[#0c0d12] text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Mã phòng</th>
                      <th className="py-4 px-6">Tên phòng chiếu</th>
                      <th className="py-4 px-6">Trạng thái</th>
                      <th className="py-4 px-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e202a]">
                    {roomsData.content.map((room) => (
                      <tr key={room.id} className="hover:bg-[#181a24] transition-colors">
                        <td className="py-4 px-6 font-mono text-zinc-400 font-semibold">
                          #{room.id}
                        </td>
                        <td className="py-4 px-6 font-bold text-white">
                          {room.name}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={room.status} size="sm" />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/admin/rooms/${room.id}/seats`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-[#e6e2c1] text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors"
                              title="Cấu hình sơ đồ ghế"
                            >
                              <Grid className="w-3.5 h-3.5" />
                              <span>Sơ đồ ghế</span>
                            </Link>

                            <Link
                              to={`/admin/showtimes/new?cinemaId=${selectedCinemaId}&roomId=${room.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-sky-400 text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors"
                              title="Tạo suất chiếu cho phòng này"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              <span>Lên lịch</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => openEditModal(room)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c24] hover:bg-[#252836] text-zinc-300 hover:text-white text-xs font-semibold rounded-lg border border-[#2b2f3e] transition-colors cursor-pointer"
                              title="Sửa phòng"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {roomsData.totalPages > 1 && (
                <div className="p-4 border-t border-[#242733] flex justify-center">
                  <Pagination
                    currentPage={roomsData.page + 1}
                    totalPages={roomsData.totalPages}
                    onPageChange={handleRoomPageChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Create/Edit Room */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRoom ? `Sửa phòng: ${editingRoom.name}` : 'Thêm phòng chiếu mới'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && <AlertMessage variant="error">{formError}</AlertMessage>}

          <div>
            <label htmlFor="roomName" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Tên phòng chiếu <span className="text-red-400">*</span>
            </label>
            <Input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Ví dụ: Cinema 1, Phòng Chiếu 02..."
              maxLength={50}
              required
              disabled={isSubmitting}
            />
            <p className="text-[11px] text-zinc-500 mt-1">Tối đa 50 ký tự, không được trùng lặp trong rạp.</p>
          </div>

          <div>
            <label htmlFor="roomStatus" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Trạng thái phòng chiếu
            </label>
            <select
              id="roomStatus"
              value={roomStatus}
              onChange={(e) => setRoomStatus(e.target.value as RoomStatus)}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-[#090a0f] border border-[#252836] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] transition-colors"
            >
              <option value="ACTIVE">ACTIVE — Đang hoạt động</option>
              <option value="MAINTENANCE">MAINTENANCE — Tạm dừng bảo trì</option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1">
              Phòng bảo trì sẽ không thể lên lịch chiếu mới hoặc mở bán vé.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#242733]">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Đang xử lý...'
                : editingRoom
                ? 'Cập nhật phòng'
                : 'Tạo phòng'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
