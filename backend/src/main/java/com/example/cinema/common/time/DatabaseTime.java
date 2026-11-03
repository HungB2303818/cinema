package com.example.cinema.common.time;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Component
@RequiredArgsConstructor
public class DatabaseTime {
    private final JdbcTemplate jdbcTemplate;

    public Instant now() {
        LocalDateTime value = jdbcTemplate.queryForObject("SELECT UTC_TIMESTAMP(3)", LocalDateTime.class);
        if (value == null) throw new IllegalStateException("Không đọc được thời gian DB.");
        return value.toInstant(ZoneOffset.UTC);
    }
}
