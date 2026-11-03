package com.example.cinema.common.error;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu yêu cầu không hợp lệ."),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Chưa xác thực hoặc token không hợp lệ."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy tài nguyên yêu cầu."),
    SEAT_UNAVAILABLE(HttpStatus.CONFLICT, "Một hoặc nhiều ghế không còn khả dụng."),
    IDEMPOTENCY_CONFLICT(HttpStatus.CONFLICT, "Yêu cầu trùng lặp nhưng tham số không khớp."),
    BOOKING_STATE_CONFLICT(HttpStatus.CONFLICT, "Trạng thái đặt vé hiện tại không cho phép thao tác này."),
    SHOWTIME_OVERLAP(HttpStatus.CONFLICT, "Suất chiếu bị trùng thời gian tại phòng đã chọn."),
    TICKET_ALREADY_USED(HttpStatus.CONFLICT, "Vé này đã được check-in trước đó."),
    BOOKING_CUTOFF_PASSED(HttpStatus.UNPROCESSABLE_ENTITY, "Đã quá thời hạn giữ chỗ cho suất chiếu (10 phút trước giờ chiếu)."),
    SEAT_NOT_IN_ROOM(HttpStatus.UNPROCESSABLE_ENTITY, "Ghế không thuộc phòng chiếu của suất chiếu này."),
    CHECKIN_TIME_INVALID(HttpStatus.UNPROCESSABLE_ENTITY, "Thời gian check-in không hợp lệ."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");

    private final HttpStatus httpStatus;
    private final String defaultMessage;

    ErrorCode(HttpStatus httpStatus, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }
}
