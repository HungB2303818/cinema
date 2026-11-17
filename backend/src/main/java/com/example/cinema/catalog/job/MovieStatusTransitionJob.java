package com.example.cinema.catalog.job;

import com.example.cinema.catalog.service.MovieService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.movie.transition.enabled", havingValue = "true", matchIfMissing = true)
public class MovieStatusTransitionJob {

    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MovieService movieService;
    private final Clock clock;

    /**
     * Tự động quét và chuyển trạng thái phim UPCOMING sang SHOWING khi đến ngày chiếu.
     * Mặc định chạy lúc 00:01:00 hàng ngày theo giờ Việt Nam (UTC+7).
     */
    @Scheduled(cron = "${app.movie.transition.cron:0 1 0 * * *}", zone = "${app.movie.transition.zone:Asia/Ho_Chi_Minh}")
    public int transitionUpcomingMovies() {
        LocalDate today = LocalDate.now(clock.withZone(VIETNAM_ZONE));
        log.info("movie.statusTransitionJob triggered for date={}", today);
        return movieService.transitionUpcomingToShowing(today);
    }

    /**
     * Tự động chạy khi ứng dụng khởi động để đồng bộ trạng thái ngay cả khi server
     * bị tắt hoặc khởi động lại trong ngày.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        try {
            LocalDate today = LocalDate.now(clock.withZone(VIETNAM_ZONE));
            log.info("movie.statusTransitionJob running on startup for date={}", today);
            movieService.transitionUpcomingToShowing(today);
        } catch (Exception ex) {
            log.warn("movie.statusTransitionJob startup execution skipped or failed: {}", ex.getMessage());
        }
    }
}
