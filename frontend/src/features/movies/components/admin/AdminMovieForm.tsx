import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { StatusBadge } from '@/shared/components/ui/StatusBadge';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { useCreateMovie } from '../../hooks/useCreateMovie';
import { useUpdateMovie } from '../../hooks/useUpdateMovie';
import { useUploadMoviePoster } from '../../hooks/useUploadMoviePoster';
import type { Movie, MovieRequest, MovieStatus, AgeRating } from '../../types/movie.types';

export interface AdminMovieFormProps {
  initialData?: Movie | null;
  isEditing?: boolean;
}

export const AdminMovieForm: React.FC<AdminMovieFormProps> = ({
  initialData,
  isEditing = false,
}) => {
  const navigate = useNavigate();

  // Form input states
  const [title, setTitle] = useState(initialData?.title || '');
  const [durationMinutes, setDurationMinutes] = useState<string>(
    initialData?.durationMinutes !== undefined ? initialData.durationMinutes.toString() : '120'
  );
  const [status, setStatus] = useState<MovieStatus>(initialData?.status || 'UPCOMING');
  const [description, setDescription] = useState(initialData?.description || '');
  const [genre, setGenre] = useState(initialData?.genre || '');
  const [ageRating, setAgeRating] = useState<AgeRating | ''>((initialData?.ageRating as AgeRating) || '');
  const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate || '');
  const [posterUrl, setPosterUrl] = useState(initialData?.posterUrl || '');

  // File upload & preview states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.posterUrl || null);
  const previewUrlRef = useRef<string | null>(null);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Partial creation state: when create succeeds but upload fails
  const [createdMovieId, setCreatedMovieId] = useState<number | null>(null);
  const [uploadFailureNotice, setUploadFailureNotice] = useState<string | null>(null);

  // Mutations
  const createMutation = useCreateMovie();
  const updateMutation = useUpdateMovie();
  const uploadPosterMutation = useUploadMoviePoster();

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || uploadPosterMutation.isPending;
  const isSubmittingRef = useRef(false);

  // Revoke object URL on change or unmount
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Update state if initialData loads later (e.g. from deep link fetch)
  const [prevInitialId, setPrevInitialId] = useState(initialData?.id);
  if (initialData && initialData.id !== prevInitialId) {
    setPrevInitialId(initialData.id);
    setTitle(initialData.title);
    setDurationMinutes(initialData.durationMinutes?.toString() || '120');
    setStatus(initialData.status);
    setDescription(initialData.description || '');
    setGenre(initialData.genre || '');
    setAgeRating((initialData.ageRating as AgeRating) || '');
    setReleaseDate(initialData.releaseDate || '');
    setPosterUrl(initialData.posterUrl || '');
    if (!selectedFile) {
      setPreviewUrl(initialData.posterUrl || null);
    }
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        posterFile: 'Ảnh poster tối đa 5 MB. Vui lòng chọn ảnh có dung lượng nhỏ hơn.',
      }));
      return;
    }

    // Validate type (JPEG or PNG)
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setFieldErrors((prev) => ({
        ...prev,
        posterFile: 'Chỉ hỗ trợ định dạng ảnh JPEG hoặc PNG.',
      }));
      return;
    }

    // Clear file error
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.posterFile;
      return next;
    });

    // Revoke previous blob URL if needed
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  // Validate form fields on client before submission
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title || !title.trim()) {
      errors.title = 'Tên phim không được để trống.';
    } else if (title.length > 255) {
      errors.title = 'Tên phim tối đa 255 ký tự.';
    }

    const durationNum = parseInt(durationMinutes, 10);
    if (!durationMinutes || isNaN(durationNum) || durationNum < 1 || durationNum > 65535) {
      errors.durationMinutes = 'Thời lượng phải là số nguyên từ 1 đến 65535 phút.';
    }

    if (!status) {
      errors.status = 'Trạng thái phim là bắt buộc.';
    }

    if (description && description.length > 16000) {
      errors.description = 'Mô tả tối đa 16000 ký tự.';
    }

    if (genre && genre.length > 100) {
      errors.genre = 'Thể loại tối đa 100 ký tự.';
    }

    if (posterUrl && posterUrl.trim()) {
      if (posterUrl.length > 500) {
        errors.posterUrl = 'URL poster tối đa 500 ký tự.';
      } else if (!/^https?:\/\/[^\s]+$/i.test(posterUrl.trim())) {
        errors.posterUrl = 'Poster phải là đường dẫn URL HTTP hoặc HTTPS hợp lệ.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Map backend upload error
  const getUploadErrorMessage = (err: unknown): string => {
    if (err instanceof ApiErrorResponse) {
      if (err.status === 413 || err.code === 'FILE_TOO_LARGE') {
        return 'Ảnh poster vượt quá kích thước cho phép (tối đa 5 MB).';
      }
      if (err.status === 415 || err.code === 'UNSUPPORTED_IMAGE_TYPE') {
        return 'Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận ảnh JPEG hoặc PNG hợp lệ.';
      }
      if (err.status === 502 || err.code === 'POSTER_UPLOAD_FAILED') {
        return 'Không thể tải ảnh lên dịch vụ Cloudinary. Vui lòng thử lại sau.';
      }
      if (err.status === 503 || err.code === 'MEDIA_STORAGE_UNAVAILABLE') {
        return 'Dịch vụ lưu trữ Cloudinary chưa được cấu hình trên máy chủ.';
      }
      return err.message || 'Lỗi khi tải ảnh poster.';
    }
    return 'Lỗi kết nối khi tải poster. Vui lòng kiểm tra lại đường truyền mạng.';
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;
    if (!validateForm()) return;

    isSubmittingRef.current = true;
    setGeneralError(null);
    setUploadFailureNotice(null);
    setSuccessNotice(null);

    const payload: MovieRequest = {
      title: title.trim(),
      durationMinutes: parseInt(durationMinutes, 10),
      status,
      description: description.trim() ? description : null,
      genre: genre.trim() ? genre.trim() : null,
      ageRating: ageRating ? ageRating : null,
      releaseDate: releaseDate.trim() ? releaseDate.trim() : null,
      posterUrl: posterUrl.trim() ? posterUrl.trim() : null,
    };

    try {
      if (isEditing) {
        const targetMovieId = initialData?.id || createdMovieId;
        if (!targetMovieId) {
          throw new Error('Không tìm thấy mã phim để cập nhật.');
        }

        // 1. Update metadata first
        let updatedMovie = await updateMutation.mutateAsync({
          id: targetMovieId,
          data: payload,
        });

        // 2. If a new file is selected, upload it sequentially
        if (selectedFile) {
          try {
            updatedMovie = await uploadPosterMutation.mutateAsync({
              id: targetMovieId,
              file: selectedFile,
            });
            // Update posterUrl in state with the new URL returned from backend
            if (updatedMovie.posterUrl) {
              setPosterUrl(updatedMovie.posterUrl);
            }
            setSelectedFile(null);
          } catch (uploadErr) {
            const uploadMsg = getUploadErrorMessage(uploadErr);
            setUploadFailureNotice(
              `Đã cập nhật thông tin phim, nhưng tải poster mới thất bại: ${uploadMsg}`
            );
            return;
          }
        }

        setSuccessNotice('Cập nhật thông tin phim thành công!');
        navigate('/admin/movies');
      } else {
        // CREATE FLOW
        // If movie was already created in a previous attempt where poster upload failed,
        // do NOT create another movie! Just retry the upload.
        let targetMovieId = createdMovieId;
        let movieObj: Movie | null = null;

        if (!targetMovieId) {
          movieObj = await createMutation.mutateAsync(payload);
          targetMovieId = movieObj.id;
          setCreatedMovieId(targetMovieId);
        }

        // Upload poster if selected
        if (selectedFile && targetMovieId) {
          try {
            const withPoster = await uploadPosterMutation.mutateAsync({
              id: targetMovieId,
              file: selectedFile,
            });
            if (withPoster.posterUrl) {
              setPosterUrl(withPoster.posterUrl);
            }
            setSelectedFile(null);
          } catch (uploadErr) {
            const uploadMsg = getUploadErrorMessage(uploadErr);
            setUploadFailureNotice(
              `Phim đã được tạo thành công với mã ID #${targetMovieId}, nhưng tải poster lên máy chủ thất bại: ${uploadMsg}. Bạn có thể bấm "Thử lại tải poster" mà không làm tạo lại phim.`
            );
            return;
          }
        }

        navigate('/admin/movies');
      }
    } catch (err: unknown) {
      if (err instanceof ApiErrorResponse) {
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          const map: Record<string, string> = {};
          err.fieldErrors.forEach((f) => {
            map[f.field] = f.message;
          });
          setFieldErrors(map);
        } else {
          setGeneralError(err.message || 'Dữ liệu không hợp lệ.');
        }
      } else if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Standalone Retry Poster Upload for partially created movie
  const handleRetryPosterUpload = async () => {
    const targetId = createdMovieId || initialData?.id;
    if (!targetId || !selectedFile || uploadPosterMutation.isPending) return;

    try {
      const res = await uploadPosterMutation.mutateAsync({
        id: targetId,
        file: selectedFile,
      });
      if (res.posterUrl) {
        setPosterUrl(res.posterUrl);
      }
      setSelectedFile(null);
      setUploadFailureNotice(null);
      setSuccessNotice('Tải poster lên thành công!');
      navigate('/admin/movies');
    } catch (uploadErr) {
      const uploadMsg = getUploadErrorMessage(uploadErr);
      setUploadFailureNotice(`Tải poster tiếp tục thất bại: ${uploadMsg}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/movies"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách phim</span>
        </Link>

        {isEditing && initialData && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Trạng thái hiện tại:</span>
            <StatusBadge status={initialData.status} size="sm" />
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="bg-[#12141c] border border-[#242733] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="border-b border-[#20232e] pb-6 mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {isEditing ? `Chỉnh sửa phim: ${initialData?.title || ''}` : 'Thêm phim mới vào hệ thống'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {isEditing
              ? 'Cập nhật siêu dữ liệu phim hoặc thay đổi ảnh poster'
              : 'Thiết lập thông tin phim chiếu rạp và tải ảnh poster'}
          </p>
        </div>

        {/* Notices */}
        {generalError && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs sm:text-sm flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Lỗi xử lý</div>
              <div>{generalError}</div>
            </div>
          </div>
        )}

        {successNotice && (
          <div role="alert" className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs sm:text-sm flex items-start gap-3 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>{successNotice}</div>
          </div>
        )}

        {uploadFailureNotice && (
          <div role="alert" className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs sm:text-sm space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{uploadFailureNotice}</div>
            </div>
            {selectedFile && (createdMovieId || initialData?.id) && (
              <div className="pl-8">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleRetryPosterUpload}
                  isLoading={uploadPosterMutation.isPending}
                  disabled={uploadPosterMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại tải poster ngay</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* The Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 columns: Textual metadata */}
            <div className="md:col-span-2 space-y-5">
              {/* Title */}
              <Input
                label="Tên phim *"
                id="movie-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={fieldErrors.title}
                placeholder="Ví dụ: Dune: Hành Tinh Cát - Phần 2"
                disabled={isSubmitting}
              />

              {/* Grid: Duration, Status, AgeRating */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Thời lượng (phút) *"
                  id="movie-duration"
                  type="number"
                  min={1}
                  max={65535}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  error={fieldErrors.durationMinutes}
                  disabled={isSubmitting}
                />

                <div className="space-y-1.5 text-left">
                  <label htmlFor="movie-status" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Trạng thái *
                  </label>
                  <select
                    id="movie-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MovieStatus)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-[#13151c] border border-[#262934] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] cursor-pointer"
                  >
                    <option value="UPCOMING">Sắp chiếu (UPCOMING)</option>
                    <option value="SHOWING">Đang chiếu (SHOWING)</option>
                    <option value="ENDED">Đã kết thúc (ENDED)</option>
                    <option value="HIDDEN">Đã ẩn (HIDDEN)</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label htmlFor="movie-age-rating" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Độ tuổi
                  </label>
                  <select
                    id="movie-age-rating"
                    value={ageRating}
                    onChange={(e) => setAgeRating(e.target.value as AgeRating | '')}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-[#13151c] border border-[#262934] rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-[#e6e2c1] cursor-pointer"
                  >
                    <option value="">Không yêu cầu</option>
                    <option value="P">P - Phổ biến</option>
                    <option value="K">K - Dưới 13 tuổi có bảo hộ</option>
                    <option value="T13">T13 - Khán giả 13+</option>
                    <option value="T16">T16 - Khán giả 16+</option>
                    <option value="T18">T18 - Khán giả 18+</option>
                    <option value="C">C - Cấm phổ biến</option>
                  </select>
                </div>
              </div>

              {/* Genre & Release Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Thể loại"
                  id="movie-genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  error={fieldErrors.genre}
                  placeholder="Ví dụ: Hành động, Viễn tưởng"
                  disabled={isSubmitting}
                />

                <Input
                  label="Ngày phát hành (YYYY-MM-DD)"
                  id="movie-release-date"
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  error={fieldErrors.releaseDate}
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="movie-description" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Mô tả nội dung
                </label>
                <textarea
                  id="movie-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Tóm tắt cốt truyện phim..."
                  className={`w-full px-4 py-2.5 bg-[#13151c] border rounded-xl text-zinc-100 placeholder-zinc-500 text-sm transition-all focus:outline-none ${
                    fieldErrors.description
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-[#262934] focus:border-[#e6e2c1]'
                  }`}
                />
                {fieldErrors.description && (
                  <p role="alert" className="text-xs text-red-400 font-medium">
                    {fieldErrors.description}
                  </p>
                )}
              </div>

              {/* Direct Poster URL fallback */}
              <Input
                label="Đường dẫn URL Poster trực tiếp (Tùy chọn)"
                id="movie-poster-url"
                value={posterUrl}
                onChange={(e) => {
                  setPosterUrl(e.target.value);
                  if (!selectedFile) {
                    setPreviewUrl(e.target.value || null);
                  }
                }}
                error={fieldErrors.posterUrl}
                placeholder="https://example.com/poster.jpg"
                helperText="Nếu tải file ảnh lên qua Cloudinary bên dưới, URL này sẽ tự động được cập nhật."
                disabled={isSubmitting}
              />
            </div>

            {/* Right 1 column: Poster Upload & Preview */}
            <div className="space-y-4">
              <div className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 text-left">
                Ảnh Poster phim
              </div>

              {/* Poster Preview box */}
              <div className="w-full aspect-[2/3] rounded-2xl bg-[#090a0f] border-2 border-dashed border-[#262934] overflow-hidden flex flex-col items-center justify-center p-2 relative shadow-inner">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Xem trước poster"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500 p-4 text-center">
                    <ImageIcon className="w-12 h-12 stroke-1" />
                    <span className="text-xs">Chưa có ảnh poster</span>
                  </div>
                )}
              </div>

              {/* File upload input */}
              <div className="space-y-2 text-left">
                <label
                  htmlFor="poster-file-input"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1a1c26] hover:bg-[#252836] text-zinc-200 text-xs font-semibold cursor-pointer border border-[#2b2e3e] transition-colors"
                >
                  <Upload className="w-4 h-4 text-[#e6e2c1]" />
                  <span>{selectedFile ? 'Đổi tệp ảnh khác' : 'Chọn tệp ảnh poster'}</span>
                </label>
                <input
                  id="poster-file-input"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="sr-only"
                />

                {selectedFile && (
                  <div className="text-xs text-zinc-300 truncate font-mono">
                    Đã chọn: <strong>{selectedFile.name}</strong> (
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}

                {fieldErrors.posterFile ? (
                  <p role="alert" className="text-xs text-red-400 font-medium">
                    {fieldErrors.posterFile}
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Hỗ trợ định dạng JPEG hoặc PNG. Dung lượng tối đa 5 MB. Ảnh sẽ được tự động xử lý và lưu trữ an toàn trên Cloudinary qua máy chủ.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#20232e]">
            <Link to="/admin/movies">
              <Button type="button" variant="outline" size="md" disabled={isSubmitting}>
                Hủy bỏ
              </Button>
            </Link>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting
                ? 'Đang lưu...'
                : isEditing
                ? 'Lưu thay đổi'
                : 'Tạo phim mới'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
