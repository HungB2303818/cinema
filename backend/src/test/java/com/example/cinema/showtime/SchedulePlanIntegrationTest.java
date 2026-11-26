package com.example.cinema.showtime;

import com.example.cinema.catalog.entity.*;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.CinemaRepository;
import com.example.cinema.cinema.repository.RoomRepository;
import com.example.cinema.cinema.repository.SeatRepository;
import com.example.cinema.showtime.dto.GenerationSummaryResponse;
import com.example.cinema.showtime.dto.SchedulePlanRequest;
import com.example.cinema.showtime.dto.SchedulePlanResponse;
import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.entity.SchedulePlanStatus;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeStatus;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import com.example.cinema.showtime.service.ScheduleGenerationLogService;
import com.example.cinema.showtime.service.SchedulePlanService;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner;
import com.example.cinema.showtime.service.ShowtimeAutoGenerationService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.reset;

@SpringBootTest(properties = {
        "app.booking.cleanup.enabled=false",
        "app.showtime.autogeneration.enabled=false",
        "app.movie.transition.enabled=false"
})
@Transactional
@EnabledIf("databaseAvailable")
class SchedulePlanIntegrationTest {

    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0.36");
    static final String LOCAL_URL = System.getenv("CINEMA_IT_JDBC_URL");

    static boolean databaseAvailable() {
        return LOCAL_URL != null && !LOCAL_URL.isBlank()
                || DockerClientFactory.instance().isDockerAvailable();
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        if (LOCAL_URL != null && !LOCAL_URL.isBlank()) {
            registry.add("spring.datasource.url", () -> LOCAL_URL);
            registry.add("spring.datasource.username",
                    () -> System.getenv().getOrDefault("CINEMA_IT_DB_USERNAME", "root"));
            registry.add("spring.datasource.password",
                    () -> System.getenv().getOrDefault("CINEMA_IT_DB_PASSWORD", "root"));
        } else {
            MYSQL.start();
            registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
            registry.add("spring.datasource.username", MYSQL::getUsername);
            registry.add("spring.datasource.password", MYSQL::getPassword);
        }
    }

    @AfterAll
    static void stopContainer() {
        if (MYSQL.isRunning()) {
            MYSQL.stop();
        }
    }

    @Autowired CinemaRepository cinemas;
    @Autowired RoomRepository rooms;
    @Autowired SeatRepository seats;
    @Autowired MovieRepository movies;
    @Autowired ShowtimeRepository showtimes;
    @Autowired ShowtimeSeatRepository inventory;
    @Autowired SchedulePlanService planService;
    @Autowired ShowtimeAutoGenerationService generationService;
    @Autowired PlatformTransactionManager transactionManager;
    @SpyBean ShowtimeAllocationPlanner planner;
    @MockBean ScheduleGenerationLogService logService;

    private Room room;
    private Movie movie;
    private LocalDate targetDate;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Cinema cinema = cinemas.save(Cinema.builder().name("Rạp IT " + suffix)
                .address("1 Đường Test").status(CinemaStatus.ACTIVE).build());
        room = rooms.save(Room.builder().cinema(cinema).name("Phòng " + suffix)
                .status(RoomStatus.ACTIVE).build());
        seats.saveAll(List.of(
                Seat.builder().room(room).seatRow("A").seatNumber(1)
                        .seatType(SeatType.STANDARD).status(PhysicalSeatStatus.ACTIVE).build(),
                Seat.builder().room(room).seatRow("A").seatNumber(2)
                        .seatType(SeatType.VIP).status(PhysicalSeatStatus.ACTIVE).build()));
        movie = movies.save(Movie.builder().title("Phim IT " + suffix).durationMinutes(60)
                .status(MovieStatus.SHOWING).releaseDate(LocalDate.now().minusDays(1)).build());
        targetDate = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
    }

    private SchedulePlanResponse createPlan(int closeHour) {
        SchedulePlanRequest request = new SchedulePlanRequest(
                "Lịch IT " + UUID.randomUUID().toString().substring(0, 6),
                room.getId(), targetDate.minusDays(1), targetDate.plusDays(7),
                List.of(1, 2, 3, 4, 5, 6, 7),
                LocalTime.of(9, 0), LocalTime.of(closeHour, 0), 15, 15,
                new BigDecimal("75000.00"), new BigDecimal("20000.00"),
                List.of(movie.getId()), SchedulePlanStatus.ACTIVE);
        return planService.create(request, "integration-test");
    }

    @Test
    void generatesShowtimesWithInventoryAndTraceability() {
        SchedulePlanResponse plan = createPlan(12);

        var result = generationService.generateDate(plan.id(), targetDate, "it-run");

        assertThat(result.outcome()).isEqualTo(GenerationOutcome.SUCCESS);
        assertThat(result.createdCount()).isEqualTo(2);

        Instant dayStart = targetDate.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Instant dayEnd = targetDate.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        var created = showtimes.findScheduledOverlapping(room.getId(), dayStart, dayEnd);
        assertThat(created).hasSize(2);
        assertThat(created).allSatisfy(showtime -> {
            assertThat(showtime.getSchedulePlanId()).isEqualTo(plan.id());
            assertThat(showtime.getBasePrice()).isEqualByComparingTo("75000.00");
            assertThat(showtime.getCleanupMinutes()).isEqualTo(15);
            assertThat(inventory.findByShowtimeId(showtime.getId())).hasSize(2);
            assertThat(showtime.getEndsAt()).isEqualTo(showtime.getStartsAt().plusSeconds(3600));
        });
    }

    @Test
    void secondRunDoesNotCreateDuplicates() {
        SchedulePlanResponse plan = createPlan(12);

        var first = generationService.generateDate(plan.id(), targetDate, "it-run-1");
        var second = generationService.generateDate(plan.id(), targetDate, "it-run-2");

        assertThat(first.createdCount()).isEqualTo(2);
        assertThat(second.createdCount()).isZero();
        Instant dayStart = targetDate.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Instant dayEnd = targetDate.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        assertThat(showtimes.findScheduledOverlapping(room.getId(), dayStart, dayEnd)).hasSize(2);
    }

    /**
     * Regression guard for the manual "Sinh ngay" path: a slot rejected by the shared showtime
     * pipeline must not mark an outer transaction rollback-only and discard the whole range.
     * The conflict is inserted after the planner already chose its slots, so it is only detected
     * by the real per-slot transaction.
     */
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void manualGenerationSurvivesSlotConflictWithoutOuterRollback() {
        SchedulePlanResponse plan = createPlan(12);
        Instant conflictStart = targetDate.atTime(9, 0)
                .atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();

        doAnswer(invocation -> {
            TransactionTemplate template = new TransactionTemplate(transactionManager);
            template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            template.executeWithoutResult(status -> showtimes.saveAndFlush(Showtime.builder()
                    .movie(movie).room(room).status(ShowtimeStatus.SCHEDULED)
                    .startsAt(conflictStart).endsAt(conflictStart.plusSeconds(3600))
                    .cleanupMinutes(15).basePrice(new BigDecimal("75000.00"))
                    .vipSurcharge(BigDecimal.ZERO).build()));
            return invocation.callRealMethod();
        }).when(planner).plan(any());

        try {
            GenerationSummaryResponse summary = planService.generate(plan.id(), targetDate,
                    targetDate, "integration-test");

            assertThat(summary.failedCount()).isZero();
            assertThat(summary.dates()).isNotEmpty();
            assertThat(summary.createdCount() + summary.skippedCount()).isPositive();
        } finally {
            reset(planner);
        }
    }
}
