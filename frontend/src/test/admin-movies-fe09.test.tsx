import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { AdminMoviesPage, AdminMovieCreatePage, AdminMovieEditPage } from '@/pages';
import { moviesApi } from '@/features/movies';
import type { Movie } from '@/features/movies';
import type { PageResponse } from '@/shared/types/api.types';
import * as authModule from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { renderWithProviders } from './test-utils';
import { AdminRoute } from '@/app/router/AdminRoute';

describe('FE-09: Admin Phim & Poster Management', () => {
  const adminUser = {
    id: 101,
    fullName: 'Tran Van Admin',
    email: 'admin@cinema.com',
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
  };

  const staffUser = {
    id: 201,
    fullName: 'Le Van Staff',
    email: 'staff@cinema.com',
    role: 'STAFF' as const,
    status: 'ACTIVE' as const,
  };

  const customerUser = {
    id: 301,
    fullName: 'Nguyen Khach',
    email: 'khach@cinema.com',
    role: 'CUSTOMER' as const,
    status: 'ACTIVE' as const,
  };

  const mockMovies: Movie[] = [
    {
      id: 1,
      title: 'Dune: Hành Tinh Cát - Phần 2',
      durationMinutes: 166,
      status: 'SHOWING',
      description: 'Hành trình trả thù và bảo vệ tương lai của Paul Atreides.',
      genre: 'Khoa học viễn tưởng, Phiêu lưu',
      ageRating: 'T16',
      releaseDate: '2024-03-01',
      posterUrl: 'https://images.unsplash.com/photo-dune.jpg',
    },
    {
      id: 2,
      title: 'Phim Ẩn Trong Quản Trị',
      durationMinutes: 110,
      status: 'HIDDEN',
      description: 'Phim đang tạm ẩn khỏi danh mục công khai.',
      genre: 'Tâm lý, Giật gân',
      ageRating: 'T18',
      releaseDate: '2024-05-15',
      posterUrl: null,
    },
    {
      id: 3,
      title: 'Kẻ Trộm Mặt Trăng 4',
      durationMinutes: 94,
      status: 'UPCOMING',
      description: 'Gru và đàn Minions trở lại trong cuộc phiêu lưu mới.',
      genre: 'Hoạt hình, Hài hước',
      ageRating: 'P',
      releaseDate: '2026-12-01',
      posterUrl: 'https://images.unsplash.com/photo-minions.jpg',
    },
  ];

  const mockPageResponse: PageResponse<Movie> = {
    content: mockMovies,
    page: 0,
    size: 10,
    totalElements: 3,
    totalPages: 1,
  };

  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy = vi.fn(() => 'blob:http://localhost:3000/mock-blob-uuid');
    revokeObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockAuth = (user: any) => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user,
      token: user ? 'mock-admin-token' : null,
      isAuthenticated: Boolean(user),
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: (r) => user?.role === r,
    });
  };

  const renderAdminApp = (initialRoute = '/admin/movies', user: any = adminUser) => {
    mockAuth(user);

    return renderWithProviders(
      <Routes>
        <Route
          path="/admin/movies"
          element={
            <AdminRoute>
              <AdminMoviesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/movies/new"
          element={
            <AdminRoute>
              <AdminMovieCreatePage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/movies/:movieId/edit"
          element={
            <AdminRoute>
              <AdminMovieEditPage />
            </AdminRoute>
          }
        />
        <Route path="/login" element={<div>Trang Đăng Nhập</div>} />
        <Route path="/" element={<div>Trang Chủ Khách Hàng</div>} />
      </Routes>,
      { initialEntries: [initialRoute] }
    );
  };

  describe('Phân quyền & Route Guard (AdminRoute)', () => {
    it('Chặn Guest truy cập /admin/movies và chuyển hướng về /', () => {
      renderAdminApp('/admin/movies', null);
      expect(screen.getByText('Trang Chủ Khách Hàng')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /quản lý phim & poster/i })).not.toBeInTheDocument();
    });

    it('Chặn STAFF hoặc CUSTOMER truy cập /admin/movies và chuyển hướng về /', () => {
      // 1. CUSTOMER
      const { unmount: unmountCust } = renderAdminApp('/admin/movies', customerUser);
      expect(screen.getByText('Trang Chủ Khách Hàng')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /quản lý phim & poster/i })).not.toBeInTheDocument();
      unmountCust();

      // 2. STAFF
      renderAdminApp('/admin/movies', staffUser);
      expect(screen.getByText('Trang Chủ Khách Hàng')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /quản lý phim & poster/i })).not.toBeInTheDocument();
    });

    it('Cho phép ADMIN truy cập danh sách và form quản trị', async () => {
      vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue(mockPageResponse);

      renderAdminApp('/admin/movies', adminUser);
      expect(await screen.findByRole('heading', { name: /quản lý phim & poster/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /thêm phim mới/i })).toBeInTheDocument();
    });
  });

  describe('Danh sách Phim Admin (AdminMovieList)', () => {
    it('Hiển thị danh sách phim thật từ GET /api/admin/movies, bao gồm cả phim HIDDEN', async () => {
      vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue(mockPageResponse);

      renderAdminApp('/admin/movies', adminUser);

      expect(await screen.findByText('Dune: Hành Tinh Cát - Phần 2')).toBeInTheDocument();
      expect(screen.getByText('Phim Ẩn Trong Quản Trị')).toBeInTheDocument();
      expect(screen.getByText('Kẻ Trộm Mặt Trăng 4')).toBeInTheDocument();

      // Kiểm tra trạng thái hiển thị
      expect(screen.getByText('Đang chiếu')).toBeInTheDocument();
      expect(screen.getByText('Đã ẩn')).toBeInTheDocument();
      expect(screen.getByText('Sắp chiếu')).toBeInTheDocument();

      // Kiểm tra hiển thị poster fallback cho phim không có ảnh
      expect(screen.getByTitle('Không có ảnh')).toBeInTheDocument();
    });

    it('Lọc theo trạng thái và thể loại qua URL params', async () => {
      const getSpy = vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue(mockPageResponse);
      const user = userEvent.setup();

      renderAdminApp('/admin/movies', adminUser);
      await screen.findByText('Dune: Hành Tinh Cát - Phần 2');

      // Chọn trạng thái HIDDEN
      const statusSelect = screen.getByLabelText(/lọc theo trạng thái/i);
      await user.selectOptions(statusSelect, 'HIDDEN');

      await waitFor(() => {
        expect(getSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'HIDDEN',
          })
        );
      });
    });

    it('Thực hiện Ẩn phim: mở modal xác nhận và gọi API update status=HIDDEN', async () => {
      vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue(mockPageResponse);
      const updateSpy = vi.spyOn(moviesApi, 'update').mockResolvedValue({
        ...mockMovies[0],
        status: 'HIDDEN',
      });
      const user = userEvent.setup();

      renderAdminApp('/admin/movies', adminUser);
      await screen.findByText('Dune: Hành Tinh Cát - Phần 2');

      // Bấm nút "Ẩn phim" của dòng Dune (id=1)
      const hideBtn = screen.getByRole('button', { name: 'Ẩn phim Dune: Hành Tinh Cát - Phần 2' });
      await user.click(hideBtn);

      // Modal xác nhận xuất hiện
      expect(screen.getByRole('heading', { name: 'Xác nhận ẩn phim' })).toBeInTheDocument();
      expect(screen.getByText(/sẽ không còn hiển thị trên trang công khai của khách hàng/i)).toBeInTheDocument();

      // Bấm xác nhận ẩn
      const confirmButton = screen.getByRole('button', { name: 'Xác nhận ẩn phim' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: 'Dune: Hành Tinh Cát - Phần 2',
            status: 'HIDDEN',
          })
        );
      });
    });

    it('Thực hiện Khôi phục phim HIDDEN: chọn trạng thái công khai mới và gọi API update', async () => {
      vi.spyOn(moviesApi, 'getAdminMovies').mockResolvedValue(mockPageResponse);
      const updateSpy = vi.spyOn(moviesApi, 'update').mockResolvedValue({
        ...mockMovies[1],
        status: 'SHOWING',
      });
      const user = userEvent.setup();

      renderAdminApp('/admin/movies', adminUser);
      await screen.findByText('Phim Ẩn Trong Quản Trị');

      // Bấm nút "Khôi phục" của phim ẩn (id=2)
      const restoreBtn = screen.getByRole('button', { name: 'Khôi phục phim Phim Ẩn Trong Quản Trị' });
      await user.click(restoreBtn);

      // Modal khôi phục xuất hiện
      expect(screen.getByRole('heading', { name: 'Khôi phục phim công khai' })).toBeInTheDocument();
      expect(screen.getByLabelText(/trạng thái hiển thị/i)).toBeInTheDocument();

      // Bấm nút "Xác nhận khôi phục"
      const confirmRestoreButton = screen.getByRole('button', { name: 'Xác nhận khôi phục' });
      await user.click(confirmRestoreButton);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          2,
          expect.objectContaining({
            title: 'Phim Ẩn Trong Quản Trị',
            status: 'SHOWING',
          })
        );
      });
    });
  });

  describe('Form Thêm mới & Chỉnh sửa (AdminMovieForm)', () => {
    it('Kiểm tra validation client-side: tên phim bắt buộc, thời lượng 1-65535, poster <= 5MB', async () => {
      const user = userEvent.setup();
      renderAdminApp('/admin/movies/new', adminUser);

      // Xóa tên phim và để trống
      const titleInput = screen.getByLabelText(/tên phim/i);
      await user.clear(titleInput);

      // Điền thời lượng không hợp lệ
      const durationInput = screen.getByLabelText(/thời lượng \(phút\)/i);
      await user.clear(durationInput);
      await user.type(durationInput, '0');

      // Bấm submit
      const submitBtn = screen.getByRole('button', { name: /tạo phim/i });
      await user.click(submitBtn);

      expect(screen.getByText(/Tên phim không được để trống/i)).toBeInTheDocument();
      expect(screen.getByText(/Thời lượng phải là số nguyên từ 1 đến 65535 phút/i)).toBeInTheDocument();
    });

    it('Tạo phim theo quy trình tuần tự: POST metadata trước -> lấy ID -> POST poster Cloudinary', async () => {
      const createSpy = vi.spyOn(moviesApi, 'create').mockResolvedValue({
        id: 99,
        title: 'Avatar: Dòng Chảy Của Nước',
        durationMinutes: 192,
        status: 'UPCOMING',
        description: 'Mô tả phim Avatar',
        genre: 'Hành động, Phiêu lưu',
        ageRating: 'T13',
        releaseDate: '2026-12-18',
        posterUrl: null,
      });

      const uploadSpy = vi.spyOn(moviesApi, 'uploadPoster').mockResolvedValue({
        id: 99,
        title: 'Avatar: Dòng Chảy Của Nước',
        durationMinutes: 192,
        status: 'UPCOMING',
        description: 'Mô tả phim Avatar',
        genre: 'Hành động, Phiêu lưu',
        ageRating: 'T13',
        releaseDate: '2026-12-18',
        posterUrl: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      });

      const user = userEvent.setup();
      renderAdminApp('/admin/movies/new', adminUser);

      // Điền form
      await user.type(screen.getByLabelText(/tên phim/i), 'Avatar: Dòng Chảy Của Nước');
      const durationInput = screen.getByLabelText(/thời lượng \(phút\)/i);
      await user.clear(durationInput);
      await user.type(durationInput, '192');

      // Chọn file ảnh hợp lệ
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File(['dummy-image-content'], 'avatar.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      // Xem trước ảnh được tạo qua URL.createObjectURL
      expect(createObjectURLSpy).toHaveBeenCalledWith(testFile);

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /tạo phim/i });
      await user.click(submitBtn);

      // Đảm bảo create metadata được gọi trước
      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Avatar: Dòng Chảy Của Nước',
            durationMinutes: 192,
            status: 'UPCOMING',
          })
        );
      });

      // Đảm bảo uploadPoster được gọi tiếp theo với id=99
      await waitFor(() => {
        expect(uploadSpy).toHaveBeenCalledWith(99, testFile);
      });
    });

    it('Xử lý thất bại từng phần khi upload poster: không tạo trùng phim khi người dùng tải lại', async () => {
      const createSpy = vi.spyOn(moviesApi, 'create').mockResolvedValue({
        id: 88,
        title: 'Phim Thử Nghiệm Upload Lỗi',
        durationMinutes: 100,
        status: 'SHOWING',
        description: null,
        genre: null,
        ageRating: null,
        releaseDate: null,
        posterUrl: null,
      });

      // Giả lập Cloudinary trả 503 SERVICE_UNAVAILABLE
      const uploadSpy = vi.spyOn(moviesApi, 'uploadPoster')
        .mockRejectedValueOnce(
          new ApiErrorResponse(
            'Dịch vụ lưu trữ Cloudinary tạm thời quá tải.',
            'SERVICE_UNAVAILABLE',
            503
          )
        )
        .mockResolvedValueOnce({
          id: 88,
          title: 'Phim Thử Nghiệm Upload Lỗi',
          durationMinutes: 100,
          status: 'SHOWING',
          description: null,
          genre: null,
          ageRating: null,
          releaseDate: null,
          posterUrl: 'https://res.cloudinary.com/demo/image/upload/v1/retry-success.jpg',
        });

      const user = userEvent.setup();
      renderAdminApp('/admin/movies/new', adminUser);

      await user.type(screen.getByLabelText(/tên phim/i), 'Phim Thử Nghiệm Upload Lỗi');

      // Chọn file ảnh
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File(['test-bytes'], 'poster.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      // Submit lần 1
      await user.click(screen.getByRole('button', { name: /tạo phim/i }));

      // Phim đã tạo thành công, nhưng thông báo lỗi upload xuất hiện
      expect(
        await screen.findByText(/Phim đã được tạo thành công với mã ID #88, nhưng tải poster lên máy chủ thất bại/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Dịch vụ lưu trữ Cloudinary/i)).toBeInTheDocument();
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(uploadSpy).toHaveBeenCalledTimes(1);

      // Nút "Thử lại tải poster ngay" xuất hiện
      const retryUploadBtn = screen.getByRole('button', { name: /thử lại tải poster ngay/i });
      expect(retryUploadBtn).toBeInTheDocument();

      // Bấm thử tải lại ảnh
      await user.click(retryUploadBtn);

      await waitFor(() => {
        expect(uploadSpy).toHaveBeenCalledTimes(2);
      });

      // QUAN TRỌNG: Không được gọi moviesApi.create thêm lần thứ 2!
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('Chỉnh sửa phim và tải poster mới: cập nhật cả metadata và poster tuần tự', async () => {
      vi.spyOn(moviesApi, 'getAdminMovieById').mockResolvedValue(mockMovies[0]);
      const updateSpy = vi.spyOn(moviesApi, 'update').mockResolvedValue({
        ...mockMovies[0],
        title: 'Dune: Phần 2 (Bản Cập Nhật)',
      });

      const uploadSpy = vi.spyOn(moviesApi, 'uploadPoster').mockResolvedValue({
        ...mockMovies[0],
        posterUrl: 'https://res.cloudinary.com/demo/image/upload/v2/new-dune-poster.jpg',
      });

      const user = userEvent.setup();
      renderAdminApp('/admin/movies/1/edit', adminUser);

      // Chờ dữ liệu ban đầu load lên
      const titleInput = await screen.findByLabelText(/tên phim/i);
      expect(titleInput).toHaveValue('Dune: Hành Tinh Cát - Phần 2');

      // Sửa tên phim
      await user.clear(titleInput);
      await user.type(titleInput, 'Dune: Phần 2 (Bản Cập Nhật)');

      // Chọn ảnh poster mới
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const newFile = new File(['new-poster-bytes'], 'new-poster.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [newFile] } });

      // Lưu thay đổi
      const saveBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: 'Dune: Phần 2 (Bản Cập Nhật)',
            posterUrl: 'https://images.unsplash.com/photo-dune.jpg',
          })
        );
        expect(uploadSpy).toHaveBeenCalledWith(1, newFile);
      });
    });

    it('Chỉnh sửa phim không đổi poster: giữ nguyên URL poster hiện có, không bị xóa', async () => {
      vi.spyOn(moviesApi, 'getAdminMovieById').mockResolvedValue(mockMovies[0]);
      const updateSpy = vi.spyOn(moviesApi, 'update').mockResolvedValue({
        ...mockMovies[0],
        description: 'Mô tả phim đã sửa',
      });
      const uploadSpy = vi.spyOn(moviesApi, 'uploadPoster');

      const user = userEvent.setup();
      renderAdminApp('/admin/movies/1/edit', adminUser);

      const titleInput = await screen.findByLabelText(/tên phim/i);
      expect(titleInput).toHaveValue('Dune: Hành Tinh Cát - Phần 2');

      // Sửa mô tả
      const descInput = screen.getByLabelText(/mô tả nội dung/i);
      await user.clear(descInput);
      await user.type(descInput, 'Mô tả phim đã sửa');

      // Lưu thay đổi mà KHÔNG chọn file mới
      const saveBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: 'Dune: Hành Tinh Cát - Phần 2',
            description: 'Mô tả phim đã sửa',
            posterUrl: 'https://images.unsplash.com/photo-dune.jpg', // Giữ nguyên URL cũ
          })
        );
      });

      // Không gọi upload poster
      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('Dọn dẹp Object URL khi unmount hoặc đổi ảnh để tránh rò rỉ bộ nhớ', () => {
      const { unmount } = renderAdminApp('/admin/movies/new', adminUser);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file1 = new File(['bytes-1'], 'f1.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file1] } });

      expect(createObjectURLSpy).toHaveBeenCalledWith(file1);

      // Đổi sang file khác
      const file2 = new File(['bytes-2'], 'f2.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file2] } });

      // Object URL cũ bị thu hồi
      expect(revokeObjectURLSpy).toHaveBeenCalled();

      // Unmount component
      unmount();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    it('Xử lý lỗi 400 VALIDATION_ERROR từ backend với fieldErrors chi tiết', async () => {
      vi.spyOn(moviesApi, 'create').mockRejectedValue(
        new ApiErrorResponse(
          'Dữ liệu không hợp lệ.',
          'VALIDATION_ERROR',
          400,
          [
            { field: 'title', message: 'Tên phim đã tồn tại trong danh mục.' },
            { field: 'durationMinutes', message: 'Thời lượng không được vượt quá 360 phút.' },
          ]
        )
      );

      const user = userEvent.setup();
      renderAdminApp('/admin/movies/new', adminUser);

      await user.type(screen.getByLabelText(/tên phim/i), 'Phim Đã Tồn Tại');
      await user.click(screen.getByRole('button', { name: /tạo phim/i }));

      expect(await screen.findByText('Tên phim đã tồn tại trong danh mục.')).toBeInTheDocument();
      expect(screen.getByText('Thời lượng không được vượt quá 360 phút.')).toBeInTheDocument();
    });
  });
});
