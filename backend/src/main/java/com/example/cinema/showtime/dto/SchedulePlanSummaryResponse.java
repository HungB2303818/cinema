package com.example.cinema.showtime.dto;

import com.example.cinema.showtime.entity.SchedulePlan;
import com.example.cinema.showtime.entity.SchedulePlanStatus;
import com.example.cinema.showtime.service.SchedulePlanDays;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record SchedulePlanSummaryResponse(
        Long id,
        String name,
        Long roomId,
        String roomName,
        Long cinemaId,
        String cinemaName,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        List<Integer> daysOfWeek,
        @JsonFormat(pattern = "HH:mm") LocalTime openTime,
        @JsonFormat(pattern = "HH:mm") LocalTime closeTime,
        int slotStepMinutes,
        int cleanupMinutes,
        BigDecimal basePrice,
        BigDecimal vipSurcharge,
        SchedulePlanStatus status,
        int movieCount) {

    public static SchedulePlanSummaryResponse from(SchedulePlan plan, int movieCount) {
        var room = plan.getRoom();
        return new SchedulePlanSummaryResponse(
                plan.getId(), plan.getName(),
                room.getId(), room.getName(),
                room.getCinema().getId(), room.getCinema().getName(),
                plan.getEffectiveFrom(), plan.getEffectiveTo(),
                SchedulePlanDays.decode(plan.getDaysOfWeek()),
                plan.getOpenTime(), plan.getCloseTime(),
                plan.getSlotStepMinutes(), plan.getCleanupMinutes(),
                plan.getBasePrice(), plan.getVipSurcharge(),
                plan.getStatus(), movieCount);
    }
}
