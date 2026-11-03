package com.example.cinema.common.error;

import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
public class AppException extends RuntimeException {

    private final ErrorCode errorCode;
    private final List<FieldErrorItem> fieldErrors;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
        this.fieldErrors = new ArrayList<>();
    }

    public AppException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.fieldErrors = new ArrayList<>();
    }

    public AppException(ErrorCode errorCode, String message, List<FieldErrorItem> fieldErrors) {
        super(message);
        this.errorCode = errorCode;
        this.fieldErrors = fieldErrors != null ? fieldErrors : new ArrayList<>();
    }
}
