import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Info } from 'lucide-react';
import { Button } from '@/shared/components/ui';

export const SeatSelectionPlaceholderPage: React.FC = () => {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const navigate = useNavigate();

  return (
    <div className="py-16 sm:py-24 max-w-xl mx-auto px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-[#e6e2c1]/10 text-[#e6e2c1] flex items-center justify-center mx-auto shadow-inner">
        <Info className="w-8 h-8" />
      </div>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181a24] text-zinc-300 text-xs font-semibold border border-[#242733]">
          <Clock className="w-3.5 h-3.5 text-[#e6e2c1]" />
          <span>Suất chiếu #{showtimeId || 'Chưa xác định'}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Chức năng chọn ghế chưa được triển khai
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
          Màn hình sơ đồ chọn ghế, tính giá và giữ chỗ theo suất chiếu thuộc phạm vi tính năng{' '}
          <strong className="text-zinc-200">FE-04</strong> và hiện đang trong quá trình hoàn thiện.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#13151d] border border-[#242733] text-left text-xs text-zinc-400 space-y-2">
        <p className="font-semibold text-zinc-300">Thông tin chuyển tiếp:</p>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Mã suất chiếu nhận được: <span className="font-mono text-[#e6e2c1]">{showtimeId}</span></li>
          <li>Hệ thống chưa tạo đơn đặt vé tạm thời hay giữ chỗ nào.</li>
          <li>Khi FE-04 hoàn thành, bạn sẽ có thể trực tiếp chọn vị trí ghế tại trang này.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate(-1)}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Quay lại trang trước</span>
        </Button>
        <Link to="/movies" className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto">
            Chọn phim khác
          </Button>
        </Link>
      </div>
    </div>
  );
};
