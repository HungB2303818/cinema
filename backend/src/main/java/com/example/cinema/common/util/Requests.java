package com.example.cinema.common.util;

import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.util.Set;

public final class Requests {
    private Requests() { }

    public static void positiveId(Long id) {
        if (id == null || id <= 0) throw new AppException(ErrorCode.VALIDATION_ERROR, "Mã phải là số nguyên dương.");
    }

    public static PageRequest page(int page, int size, String sort, Set<String> fields) {
        if (page < 0 || size < 1 || size > 100) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "page phải >= 0; size phải từ 1 đến 100.");
        }
        String[] parts = sort == null ? new String[0] : sort.split(",", -1);
        if (parts.length != 2 || !fields.contains(parts[0])
                || !(parts[1].equalsIgnoreCase("asc") || parts[1].equalsIgnoreCase("desc"))) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tham số sort không hợp lệ.");
        }
        Sort order = Sort.by(Sort.Direction.fromString(parts[1]), parts[0]);
        if (!parts[0].equals("id")) order = order.and(Sort.by("id"));
        return PageRequest.of(page, size, order);
    }
}
