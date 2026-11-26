package com.example.cinema.showtime.service;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;

public final class SchedulePlanDays {

    private SchedulePlanDays() {
    }

    public static int encode(List<Integer> days) {
        int mask = 0;
        for (Integer day : days) {
            if (day == null || day < 1 || day > 7) {
                throw new IllegalArgumentException("Thứ trong tuần phải từ 1 đến 7.");
            }
            mask |= 1 << (day - 1);
        }
        return mask;
    }

    public static List<Integer> decode(int mask) {
        List<Integer> days = new ArrayList<>();
        for (int day = 1; day <= 7; day++) {
            if ((mask & (1 << (day - 1))) != 0) {
                days.add(day);
            }
        }
        return days;
    }

    public static boolean includes(int mask, DayOfWeek dayOfWeek) {
        return (mask & (1 << (dayOfWeek.getValue() - 1))) != 0;
    }
}
