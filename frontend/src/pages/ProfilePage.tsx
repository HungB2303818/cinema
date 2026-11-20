import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import { Pencil, UserRound } from 'lucide-react';
import { authApi, useAuth } from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { Button, ErrorState, LoadingSpinner } from '@/shared/components/ui';

const ROLE_LABELS = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
};

function formatJoinedDate(value?: string) {
  if (!value) return 'Chưa có thông tin';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có thông tin';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

export function ProfilePage() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const { data: profile, isPending, error, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    retry: false,
    gcTime: 0,
  });
  const update = useMutation({
    mutationFn: authApi.updateMe,
    gcTime: 0,
    onSuccess: (response) => {
      login(response.token, response.user, { preserveBookingState: true });
      queryClient.setQueryData(['profile', response.user.id], response.user);
      setEditing(false);
      setCurrentPassword('');
      setSaved(true);
      update.reset();
    },
  });
  const expired = (error instanceof ApiErrorResponse && error.status === 401) ||
    (update.error instanceof ApiErrorResponse && update.error.status === 401);
  const emailChanged = profile && email.trim().toLowerCase() !== profile.email.toLowerCase();
  const inputClass = 'mt-2 w-full rounded-xl border-0 bg-white/5 px-4 py-3 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';

  const startEditing = () => {
    if (!profile) return;
    setFullName(profile.fullName);
    setEmail(profile.email);
    setCurrentPassword('');
    setSaved(false);
    update.reset();
    setEditing(true);
  };

  useEffect(() => {
    if (expired) logout();
  }, [expired, logout]);

  if (expired || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Thông tin cá nhân</h1>
        {profile && !error && !editing && (
          <Button type="button" variant="ghost" onClick={startEditing}>
            <Pencil className="size-4" aria-hidden="true" /> Sửa thông tin
          </Button>
        )}
      </div>
      {saved && <p role="status" className="text-sm text-emerald-300">Đã cập nhật thông tin cá nhân.</p>}

      {isPending ? (
        <LoadingSpinner message="Đang tải thông tin cá nhân..." className="min-h-64" />
      ) : error ? (
        <ErrorState
          title="Không thể tải thông tin cá nhân"
          message={error instanceof Error ? error.message : 'Vui lòng thử lại sau.'}
          onRetry={() => refetch()}
        />
      ) : profile ? (
        <section aria-label="Thông tin tài khoản">
          <div className="flex items-center gap-4 py-7 sm:gap-6 sm:py-9">
            <div aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-text sm:size-20 sm:text-3xl">
              {profile.fullName.trim().charAt(0).toLocaleUpperCase('vi-VN') || <UserRound className="size-8" />}
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-xl font-semibold text-white sm:text-2xl">{profile.fullName}</h2>
              <p className="mt-1 break-all text-sm text-zinc-400">{profile.email}</p>
            </div>
          </div>

          {editing ? (
            <form aria-label="Sửa thông tin cá nhân" onSubmit={(event) => {
              event.preventDefault();
              if (update.isPending || !fullName.trim()) return;
              update.mutate({
                fullName: fullName.trim(), email: email.trim().toLowerCase(),
                ...(emailChanged ? { currentPassword } : {}),
              });
            }} className="max-w-2xl space-y-6 py-6">
              <fieldset disabled={update.isPending} className="space-y-6">
                <legend className="sr-only">Thông tin có thể chỉnh sửa</legend>
                <div>
                  <label htmlFor="profile-full-name" className="text-sm text-zinc-300">Họ và tên</label>
                  <input id="profile-full-name" name="fullName" autoComplete="name" required maxLength={150} value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="profile-email" className="text-sm text-zinc-300">Email</label>
                  <input id="profile-email" name="email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => { setEmail(event.target.value); setCurrentPassword(''); }} className={inputClass} aria-describedby="profile-email-note" />
                  <p id="profile-email-note" className="mt-2 text-xs text-zinc-400">Email này được dùng để đăng nhập tài khoản.</p>
                </div>
                {emailChanged && (
                  <div>
                    <label htmlFor="profile-password" className="text-sm text-zinc-300">Mật khẩu hiện tại</label>
                    <input id="profile-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={100} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} aria-describedby="profile-password-note" />
                    <p id="profile-password-note" className="mt-2 text-xs text-zinc-400">Xác nhận mật khẩu hiện tại để đổi email. Mật khẩu của bạn không thay đổi.</p>
                  </div>
                )}
              </fieldset>
              {update.error && (
                <div role="alert" className="space-y-1 text-sm text-red-300">
                  <p>{update.error.message}</p>
                  {update.error instanceof ApiErrorResponse && update.error.fieldErrors?.map((field) => <p key={field.field}>{field.message}</p>)}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" isLoading={update.isPending} disabled={!fullName.trim() || !email.trim()}>Lưu thay đổi</Button>
                <Button type="button" variant="ghost" disabled={update.isPending} onClick={() => { setEditing(false); setCurrentPassword(''); update.reset(); }}>Hủy</Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-x-10 gap-y-7 py-8 sm:grid-cols-2 sm:py-9">
              <div className="min-w-0">
                <dt className="text-sm text-zinc-400">Họ và tên</dt>
                <dd className="mt-2 break-words font-medium text-zinc-100">{profile.fullName}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm text-zinc-400">Email</dt>
                <dd className="mt-2 break-all font-medium text-zinc-100">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-400">Vai trò</dt>
                <dd className="mt-2 font-medium text-zinc-100">{ROLE_LABELS[profile.role]}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-400">Trạng thái tài khoản</dt>
                <dd className={`mt-2 inline-flex items-center gap-2 text-sm font-medium ${profile.status === 'ACTIVE' ? 'text-emerald-300' : 'text-red-300'}`}>
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${profile.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  {profile.status === 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-400">Ngày tham gia</dt>
                <dd className="mt-2 font-medium text-zinc-100">{formatJoinedDate(profile.createdAt)}</dd>
              </div>
            </dl>
          )}
        </section>
      ) : null}
    </div>
  );
}
