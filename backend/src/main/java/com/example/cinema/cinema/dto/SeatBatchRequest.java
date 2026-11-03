package com.example.cinema.cinema.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record SeatBatchRequest(@NotEmpty(message = "Danh sách ghế không được rỗng.")
                               @Size(max = 1000, message = "Mỗi batch tối đa 1000 ghế.")
                               List<@NotNull(message = "Ghế không được null.") @Valid SeatRequest> seats) { }
