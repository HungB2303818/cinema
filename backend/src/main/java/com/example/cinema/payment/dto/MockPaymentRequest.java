package com.example.cinema.payment.dto;

import jakarta.validation.constraints.*;

public record MockPaymentRequest(@NotNull(message = "Kết quả mô phỏng là bắt buộc.") Result simulatedResult,
        @NotBlank(message = "Khóa thanh toán không được trống.")
        @Size(max = 64, message = "Khóa thanh toán tối đa 64 ký tự.") String idempotencyKey) {
    public enum Result {
        SUCCESS, FAILED;

        @com.fasterxml.jackson.annotation.JsonCreator
        public static Result parse(String value) { return Result.valueOf(value); }
    }
}
