import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth';
import { ApiErrorResponse } from '@/shared/api/http-client';
import { reportsApi } from '../api/reports.api';
import type { RevenueExportFile, RevenueExportGroupBy, RevenueFilters } from '../types/report.types';

export interface ExportRevenueInput {
  filters: RevenueFilters;
  groupBy: RevenueExportGroupBy;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const useExportRevenue = () => {
  const { user } = useAuth();
  const userIdRef = useRef(user?.id);
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  return useMutation<RevenueExportFile, Error, ExportRevenueInput>({
    mutationFn: async ({ filters, groupBy }) => {
      const startedUserId = userIdRef.current;
      const file = await reportsApi.exportCsv(filters, groupBy);
      if (userIdRef.current !== startedUserId) {
        throw new ApiErrorResponse(
          'Phiên đăng nhập đã thay đổi. Vui lòng tải lại báo cáo trước khi xuất.',
          'SESSION_CHANGED'
        );
      }
      return file;
    },
    onSuccess: (file) => triggerBlobDownload(file.blob, file.filename),
  });
};
