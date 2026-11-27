package com.example.cinema.report.service;

import com.example.cinema.report.dto.RevenueExportData;
import com.example.cinema.report.dto.RevenueExportGroupBy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RevenueCsvExportService {
    private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
    private static final String FORMULA_PREFIXES = "=+-@\t\r";

    private final RevenueAnalyticsService analytics;

    public byte[] export(LocalDate from, LocalDate to, Long cinemaId, Long movieId,
            RevenueExportGroupBy groupBy) {
        return build(analytics.export(from, to, cinemaId, movieId, groupBy));
    }

    private byte[] build(RevenueExportData data) {
        StringBuilder csv = new StringBuilder();
        csv.append("Báo cáo doanh thu thanh toán mô phỏng\r\n");
        csv.append(textRow("Từ ngày", data.filter().from().toString()));
        csv.append(textRow("Đến ngày", data.filter().to().toString()));
        csv.append(textRow("Rạp", data.filter().cinemaId() == null ? "Tất cả" : data.filter().cinemaId().toString()));
        csv.append(textRow("Phim", data.filter().movieId() == null ? "Tất cả" : data.filter().movieId().toString()));
        csv.append(textRow("Nhóm", data.groupBy().name()));
        csv.append(textRow("Múi giờ", RevenueAnalyticsService.TIMEZONE));
        csv.append(textRow("Thời điểm tạo", Instant.now().toString()));
        csv.append("\r\n");

        boolean timeGroup = data.groupBy() == RevenueExportGroupBy.DAY
                || data.groupBy() == RevenueExportGroupBy.MONTH;
        if (timeGroup) {
            csv.append(textRow("Kỳ", "Doanh thu (VND)", "Giao dịch thành công", "Vé đã bán"));
            data.series().forEach(point -> csv.append(textRow(point.period(), point.totalRevenue(),
                    Long.toString(point.successfulPayments()), Long.toString(point.ticketsSold()))));
        } else {
            csv.append(textRow("ID", "Tên", "Doanh thu (VND)", "Giao dịch thành công", "Vé đã bán"));
            data.breakdown().forEach(row -> csv.append(textRow(String.valueOf(row.groupId()), row.groupName(),
                    row.totalRevenue(), Long.toString(row.successfulPayments()),
                    Long.toString(row.ticketsSold()))));
        }

        byte[] body = csv.toString().getBytes(StandardCharsets.UTF_8);
        byte[] withBom = new byte[UTF8_BOM.length + body.length];
        System.arraycopy(UTF8_BOM, 0, withBom, 0, UTF8_BOM.length);
        System.arraycopy(body, 0, withBom, UTF8_BOM.length, body.length);
        return withBom;
    }

    private static String textRow(String... cells) {
        return Arrays.stream(cells)
                .map(RevenueCsvExportService::cell)
                .collect(Collectors.joining(",")) + "\r\n";
    }

    private static String cell(String value) {
        String text = value == null ? "" : value;
        if (!text.isEmpty() && FORMULA_PREFIXES.indexOf(text.charAt(0)) >= 0) {
            text = "'" + text;
        }
        if (text.indexOf(',') >= 0 || text.indexOf('"') >= 0
                || text.indexOf('\n') >= 0 || text.indexOf('\r') >= 0) {
            text = '"' + text.replace("\"", "\"\"") + '"';
        }
        return text;
    }
}
