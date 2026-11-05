import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Button } from '@/shared/components/ui/Button';
import { useAdminMovieDetail, AdminMovieForm } from '@/features/movies';

export const AdminMovieEditPage: React.FC = () => {
  const { movieId } = useParams<{ movieId: string }>();
  const id = movieId ? parseInt(movieId, 10) : NaN;

  const { data: movie, isLoading, isError, error, refetch } = useAdminMovieDetail(
    !isNaN(id) && id > 0 ? id : undefined
  );

  if (isNaN(id) || id <= 0) {
    return (
      <div className="py-12">
        <EmptyState
          title="ID phim không hợp lệ"
          description="Đường dẫn chứa mã phim không đúng định dạng."
          action={
            <Link to="/admin/movies">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Về danh sách phim</span>
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4" role="status">
        <LoadingSpinner message="Đang tải thông tin phim..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12">
        <ErrorState
          title="Không thể tải thông tin phim"
          message={error?.message || 'Không tìm thấy phim hoặc đã xảy ra lỗi từ máy chủ.'}
          onRetry={() => refetch()}
          action={
            <Link to="/admin/movies">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Về danh sách</span>
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="py-12">
        <EmptyState
          title="Không tìm thấy phim"
          description={`Phim có ID #${id} không tồn tại hoặc đã bị xóa.`}
          action={
            <Link to="/admin/movies">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Về danh sách phim</span>
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminMovieForm initialData={movie} isEditing={true} />
    </div>
  );
};
