package com.example.cinema.common.error;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Content-Type của yêu cầu không được hỗ trợ."),
    MEDIA_STORAGE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Cloudinary chưa được cấu hình. Vui lòng liên hệ quản trị hệ thống."),
    POSTER_UPLOAD_FAILED(HttpStatus.BAD_GATEWAY, "Không thể upload poster lên Cloudinary. Vui lòng thử lại sau."),
    FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "Poster tối đa 5 MB; tổng multipart request tối đa 6 MB."),
    UNSUPPORTED_IMAGE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Poster chỉ hỗ trợ ảnh JPEG hoặc PNG hợp lệ."),
    BOOKING_EXPIRED(HttpStatus.CONFLICT, "Đơn đặt vé đã hết thời hạn giữ ghế."),
    BOOKING_CONCURRENT_CONFLICT(HttpStatus.CONFLICT, "Không thể hoàn tất do xung đột đồng thời. Vui lòng thử lại cùng request key."),
    BOOKING_AMOUNT_INVALID(HttpStatus.UNPROCESSABLE_ENTITY, "Tổng tiền đặt vé vượt giới hạn lưu trữ."),
    SHOWTIME_UNAVAILABLE(HttpStatus.UNPROCESSABLE_ENTITY, "Suất chiếu không còn mở đặt vé."),
    SEAT_NOT_BOOKABLE(HttpStatus.UNPROCESSABLE_ENTITY, "Ghế đang bảo trì hoặc chưa có inventory cho suất chiếu."),
    RESOURCE_STATE_CONFLICT(HttpStatus.CONFLICT, "Tài nguyên đã có dữ liệu liên quan hoặc trạng thái không cho phép thao tác."),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "Tên phòng hoặc vị trí ghế đã tồn tại."),
    SCHEDULE_INVALID(HttpStatus.UNPROCESSABLE_ENTITY, "Thời gian hoặc giá suất chiếu không hợp lệ."),
    ROOM_UNAVAILABLE(HttpStatus.UNPROCESSABLE_ENTITY, "Rạp/phòng không hoạt động hoặc không có ghế hoạt động."),
    MOVIE_UNAVAILABLE(HttpStatus.UNPROCESSABLE_ENTITY, "Phim đang ẩn, không thể lập lịch chiếu."),
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
