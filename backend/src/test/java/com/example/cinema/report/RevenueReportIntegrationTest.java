package com.example.cinema.report;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.*;
import com.example.cinema.booking.repository.*;
import com.example.cinema.catalog.entity.*;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.*;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.payment.entity.*;
import com.example.cinema.payment.repository.PaymentRepository;
import com.example.cinema.report.dto.*;
import com.example.cinema.report.service.RevenueAnalyticsService;
import com.example.cinema.report.service.RevenueCsvExportService;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = "app.booking.cleanup.enabled=false")
@WithMockUser(roles = "ADMIN")
@Transactional
@EnabledIf("databaseAvailable")
class RevenueReportIntegrationTest {
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0.36");
    static final String LOCAL_URL = System.getenv("CINEMA_IT_JDBC_URL");
    static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

    static boolean databaseAvailable() {
        return LOCAL_URL != null && !LOCAL_URL.isBlank() || DockerClientFactory.instance().isDockerAvailable();
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        if (LOCAL_URL != null && !LOCAL_URL.isBlank()) {
            registry.add("spring.datasource.url", () -> LOCAL_URL);
            registry.add("spring.datasource.username", () -> System.getenv().getOrDefault("CINEMA_IT_DB_USERNAME", "root"));
            registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("CINEMA_IT_DB_PASSWORD", "root"));
        } else {
            MYSQL.start();
            registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
            registry.add("spring.datasource.username", MYSQL::getUsername);
            registry.add("spring.datasource.password", MYSQL::getPassword);
        }
    }

    @AfterAll
    static void stopContainer() {
        if (MYSQL.isRunning()) MYSQL.stop();
    }

    @Autowired RevenueAnalyticsService analytics;
    @Autowired RevenueCsvExportService csv;
    @Autowired CinemaRepository cinemas;
    @Autowired RoomRepository rooms;
    @Autowired SeatRepository seats;
    @Autowired MovieRepository movies;
    @Autowired ShowtimeRepository showtimes;
    @Autowired ShowtimeSeatRepository inventory;
    @Autowired UserRepository users;
    @Autowired BookingRepository bookings;
    @Autowired BookingSeatRepository bookingSeats;
    @Autowired PaymentRepository payments;

    Cinema cinemaA, cinemaB;
    Room roomA, roomB;
    List<Seat> seatsA, seatsB;
    Movie movieA, movieB;
    User customer;
    int showtimeOffset;

    @BeforeEach
    void fixture() {
        String suffix = UUID.randomUUID().toString();
        cinemaA = cinemas.saveAndFlush(Cinema.builder().name("Rạp A " + suffix).address("Địa chỉ A").build());
        cinemaB = cinemas.saveAndFlush(Cinema.builder().name("Rạp B " + suffix).address("Địa chỉ B").build());
        roomA = rooms.saveAndFlush(Room.builder().cinema(cinemaA).name("Phòng A").build());
        roomB = rooms.saveAndFlush(Room.builder().cinema(cinemaB).name("Phòng B").build());
        seatsA = List.of(
                seats.saveAndFlush(Seat.builder().room(roomA).seatRow("A").seatNumber(1).build()),
                seats.saveAndFlush(Seat.builder().room(roomA).seatRow("A").seatNumber(2).build()),
                seats.saveAndFlush(Seat.builder().room(roomA).seatRow("A").seatNumber(3).build()));
        seatsB = List.of(seats.saveAndFlush(Seat.builder().room(roomB).seatRow("A").seatNumber(1).build()));
        movieA = movies.saveAndFlush(Movie.builder().title("Phim trùng tên").durationMinutes(90)
                .status(MovieStatus.SHOWING).build());
        movieB = movies.saveAndFlush(Movie.builder().title("Phim trùng tên").durationMinutes(90)
                .status(MovieStatus.SHOWING).build());
        String hash = users.findByEmail("customer1@cinema.com").orElseThrow().getPasswordHash();
        customer = users.saveAndFlush(User.builder().fullName("Khách báo cáo")
                .email("report-" + suffix + "@example.test").passwordHash(hash).build());
    }

    @Test
    void oneBookingWithThreeSeatsCountsRevenueOnceAndThreeTickets() {
        LocalDate day = LocalDate.of(2500, 5, 10);
        paid(movieA, roomA, seatsA, 3, "240000.00", at("2500-05-10T10:00:00+07:00"));

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("240000.00");
        assertThat(response.summary().successfulPayments()).isEqualTo(1);
        assertThat(response.summary().ticketsSold()).isEqualTo(3);
        assertThat(response.summary().averageRevenuePerPayment()).isEqualTo("240000.00");
        assertThat(response.timeSeries()).singleElement().satisfies(point -> {
            assertThat(point.period()).isEqualTo("2500-05-10");
            assertThat(point.totalRevenue()).isEqualTo("240000.00");
            assertThat(point.ticketsSold()).isEqualTo(3);
        });
    }

    @Test
    void twoBookingsWithTheSameAmountAreBothCounted() {
        LocalDate day = LocalDate.of(2500, 5, 11);
        paid(movieA, roomA, seatsA, 1, "240000.00", at("2500-05-11T09:00:00+07:00"));
        paid(movieA, roomA, seatsA, 1, "240000.00", at("2500-05-11T11:00:00+07:00"));

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("480000.00");
        assertThat(response.summary().successfulPayments()).isEqualTo(2);
        assertThat(response.summary().ticketsSold()).isEqualTo(2);
    }

    @Test
    void failedAndInitiatedAttemptsDoNotCount() {
        LocalDate day = LocalDate.of(2500, 5, 12);
        Booking booking = booking(movieA, roomA, seatsA, 2, "150000.00");
        attempt(booking, PaymentStatus.FAILED, "150000.00", at("2500-05-12T09:00:00+07:00"));
        attempt(booking, PaymentStatus.INITIATED, "150000.00", at("2500-05-12T09:01:00+07:00"));
        success(booking, "150000.00", at("2500-05-12T09:02:00+07:00"));

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("150000.00");
        assertThat(response.summary().successfulPayments()).isEqualTo(1);
        assertThat(response.summary().ticketsSold()).isEqualTo(2);
    }

    @Test
    void vietnamDayBoundariesAreHalfOpen() {
        LocalDate day = LocalDate.of(2500, 6, 1);
        Instant start = day.atStartOfDay(VIETNAM).toInstant();
        paid(movieA, roomA, seatsA, 1, "100.00", start.minusMillis(1));
        paid(movieA, roomA, seatsA, 1, "200.00", start);
        paid(movieA, roomA, seatsA, 1, "400.00", start.plusSeconds(86_400));

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("200.00");
        assertThat(response.summary().successfulPayments()).isEqualTo(1);
    }

    @Test
    void monthSeriesKeepsZeroPeriodsAndIgnoresOutsideRange() {
        LocalDate from = LocalDate.of(2500, 1, 15);
        LocalDate to = LocalDate.of(2500, 3, 2);
        paid(movieA, roomA, seatsA, 1, "500.00", at("2500-02-10T12:00:00+07:00"));
        paid(movieA, roomA, seatsA, 1, "900.00", at("2500-04-10T12:00:00+07:00"));

        RevenueDashboardResponse response = analytics.dashboard(from, to, null, null, RevenueTimeGroup.MONTH);

        assertThat(response.timeSeries()).extracting(RevenueSeriesPoint::period)
                .containsExactly("2500-01", "2500-02", "2500-03");
        assertThat(response.timeSeries()).extracting(RevenueSeriesPoint::totalRevenue)
                .containsExactly("0.00", "500.00", "0.00");
        assertThat(response.summary().totalRevenue()).isEqualTo("500.00");
    }

    @Test
    void zeroAmountSuccessStillCountsPaymentAndTickets() {
        LocalDate day = LocalDate.of(2500, 12, 1);
        paid(movieA, roomA, seatsA, 2, "0.00", at("2500-12-01T10:00:00+07:00"));

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("0.00");
        assertThat(response.summary().successfulPayments()).isEqualTo(1);
        assertThat(response.summary().ticketsSold()).isEqualTo(2);
        assertThat(response.summary().averageRevenuePerPayment()).isEqualTo("0.00");
    }

    @Test
    void cancelledShowtimeAfterPaymentKeepsRevenue() {
        LocalDate day = LocalDate.of(2500, 12, 2);
        Booking booking = paid(movieA, roomA, seatsA, 1, "175000.00", at("2500-12-02T10:00:00+07:00"));
        Showtime showtime = booking.getShowtime();
        showtime.setStatus(ShowtimeStatus.CANCELLED);
        showtimes.saveAndFlush(showtime);

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("175000.00");
        assertThat(response.summary().successfulPayments()).isEqualTo(1);
        assertThat(response.summary().ticketsSold()).isEqualTo(1);
    }

    @Test
    void laterShowtimePriceChangesDoNotAlterHistoricalRevenue() {
        LocalDate day = LocalDate.of(2500, 12, 3);
        Booking booking = paid(movieA, roomA, seatsA, 2, "200000.00", at("2500-12-03T10:00:00+07:00"));
        Showtime showtime = booking.getShowtime();
        showtime.setBasePrice(new BigDecimal("999999.00"));
        showtime.setVipSurcharge(new BigDecimal("88888.00"));
        showtimes.saveAndFlush(showtime);

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("200000.00");
        assertThat(response.summary().ticketsSold()).isEqualTo(2);
    }

    @Test
    void largeAmountKeepsEveryDigitOfTheDecimalString() {
        LocalDate day = LocalDate.of(2500, 12, 4);
        paid(movieA, roomA, seatsA, 1, "9999999999.99", at("2500-12-04T10:00:00+07:00"));

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("9999999999.99");
        assertThat(response.summary().averageRevenuePerPayment()).isEqualTo("9999999999.99");
    }

    @Test
    void leapYearFebruaryKeepsDayAndMonthPeriods() {
        LocalDate from = LocalDate.of(2504, 2, 1);
        LocalDate to = LocalDate.of(2504, 2, 29);
        paid(movieA, roomA, seatsA, 1, "123.45", at("2504-02-29T12:00:00+07:00"));

        RevenueDashboardResponse daily = analytics.dashboard(from, to, null, null, RevenueTimeGroup.DAY);
        assertThat(daily.timeSeries()).hasSize(29);
        assertThat(daily.timeSeries().get(28).period()).isEqualTo("2504-02-29");
        assertThat(daily.timeSeries().get(28).totalRevenue()).isEqualTo("123.45");

        RevenueDashboardResponse monthly = analytics.dashboard(from, to, null, null, RevenueTimeGroup.MONTH);
        assertThat(monthly.timeSeries()).singleElement().satisfies(point -> {
            assertThat(point.period()).isEqualTo("2504-02");
            assertThat(point.totalRevenue()).isEqualTo("123.45");
        });
    }

    @Test
    void movieAndCinemaFiltersShareTheSamePopulation() {
        LocalDate day = LocalDate.of(2500, 7, 1);
        paid(movieA, roomA, seatsA, 1, "100.00", at("2500-07-01T10:00:00+07:00"));
        paid(movieB, roomB, seatsB, 1, "200.00", at("2500-07-01T10:00:00+07:00"));

        assertThat(analytics.dashboard(day, day, cinemaA.getId(), null, RevenueTimeGroup.DAY)
                .summary().totalRevenue()).isEqualTo("100.00");
        assertThat(analytics.dashboard(day, day, null, movieB.getId(), RevenueTimeGroup.DAY)
                .summary().totalRevenue()).isEqualTo("200.00");
        assertThat(analytics.dashboard(day, day, cinemaA.getId(), movieB.getId(), RevenueTimeGroup.DAY)
                .summary().totalRevenue()).isEqualTo("0.00");
        assertThat(analytics.dashboard(day, day, cinemaB.getId(), movieB.getId(), RevenueTimeGroup.DAY)
                .summary().ticketsSold()).isEqualTo(1);
    }

    @Test
    void historicalRevenueSurvivesHiddenMovieAndInactiveCinema() {
        LocalDate day = LocalDate.of(2500, 8, 1);
        paid(movieA, roomA, seatsA, 2, "300.00", at("2500-08-01T10:00:00+07:00"));
        movieA.setStatus(MovieStatus.HIDDEN);
        movies.saveAndFlush(movieA);
        cinemaA.setStatus(CinemaStatus.INACTIVE);
        cinemas.saveAndFlush(cinemaA);

        RevenueDashboardResponse response = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("300.00");
        assertThat(response.summary().ticketsSold()).isEqualTo(2);
    }

    @Test
    void breakdownGroupsByMovieIdEvenWhenTitlesMatch() {
        LocalDate day = LocalDate.of(2500, 9, 1);
        paid(movieA, roomA, seatsA, 1, "100.00", at("2500-09-01T10:00:00+07:00"));
        paid(movieB, roomA, seatsA, 1, "200.00", at("2500-09-01T11:00:00+07:00"));

        RevenueBreakdownResponse response = analytics.breakdown(day, day, null, null,
                RevenueGroupBy.MOVIE, 0, 20, "totalRevenue,desc");

        assertThat(response.rows().content()).hasSize(2);
        assertThat(response.rows().content()).extracting(RevenueBreakdownRow::groupName)
                .containsOnly("Phim trùng tên");
        assertThat(response.rows().content()).extracting(RevenueBreakdownRow::groupId)
                .containsExactlyInAnyOrder(movieA.getId(), movieB.getId());
        assertThat(response.rows().content().get(0).totalRevenue()).isEqualTo("200.00");
    }

    @Test
    void breakdownPaginationSortAndTotalsReconcile() {
        LocalDate day = LocalDate.of(2500, 10, 1);
        Movie movieC = movies.saveAndFlush(Movie.builder().title("A phim").durationMinutes(90)
                .status(MovieStatus.SHOWING).build());
        paid(movieA, roomA, seatsA, 1, "100.00", at("2500-10-01T10:00:00+07:00"));
        paid(movieB, roomA, seatsA, 1, "200.00", at("2500-10-01T11:00:00+07:00"));
        paid(movieC, roomA, seatsA, 1, "300.00", at("2500-10-01T12:00:00+07:00"));

        RevenueBreakdownResponse first = analytics.breakdown(day, day, null, null,
                RevenueGroupBy.MOVIE, 0, 2, "totalRevenue,desc");
        assertThat(first.rows().content()).hasSize(2);
        assertThat(first.rows().totalElements()).isEqualTo(3);
        assertThat(first.rows().totalPages()).isEqualTo(2);
        assertThat(first.rows().content()).extracting(RevenueBreakdownRow::totalRevenue)
                .containsExactly("300.00", "200.00");

        RevenueBreakdownResponse second = analytics.breakdown(day, day, null, null,
                RevenueGroupBy.MOVIE, 1, 2, "totalRevenue,desc");
        assertThat(second.rows().content()).singleElement()
                .satisfies(row -> assertThat(row.totalRevenue()).isEqualTo("100.00"));

        RevenueBreakdownResponse byName = analytics.breakdown(day, day, null, null,
                RevenueGroupBy.MOVIE, 0, 20, "groupName,asc");
        assertThat(byName.rows().content()).extracting(RevenueBreakdownRow::groupName)
                .containsExactly("A phim", "Phim trùng tên", "Phim trùng tên");

        RevenueDashboardResponse dashboard = analytics.dashboard(day, day, null, null, RevenueTimeGroup.DAY);
        RevenueBreakdownResponse movieRows = analytics.breakdown(day, day, null, null,
                RevenueGroupBy.MOVIE, 0, 100, "totalRevenue,desc");
        RevenueBreakdownResponse cinemaRows = analytics.breakdown(day, day, null, null,
                RevenueGroupBy.CINEMA, 0, 100, "totalRevenue,desc");
        assertThat(sum(movieRows.rows().content())).isEqualByComparingTo(dashboard.summary().totalRevenue());
        assertThat(sum(cinemaRows.rows().content())).isEqualByComparingTo(dashboard.summary().totalRevenue());
    }

    @Test
    void csvExportContainsEveryFilteredGroup() {
        LocalDate day = LocalDate.of(2500, 11, 1);
        paid(movieA, roomA, seatsA, 1, "100.00", at("2500-11-01T10:00:00+07:00"));
        paid(movieB, roomA, seatsA, 1, "200.00", at("2500-11-01T11:00:00+07:00"));

        String text = new String(csv.export(day, day, null, null, RevenueExportGroupBy.MOVIE),
                StandardCharsets.UTF_8);

        assertThat(text).contains("Nhóm,MOVIE");
        assertThat(text).contains("100.00");
        assertThat(text).contains("200.00");
        assertThat(text).contains("Phim trùng tên");
    }

    @Test
    void unknownFilterIdsAre404AndOversizedRangesAre400() {
        LocalDate day = LocalDate.of(2500, 1, 1);
        assertCode(() -> analytics.dashboard(day, day, 999_999L, null, RevenueTimeGroup.DAY),
                ErrorCode.RESOURCE_NOT_FOUND);
        assertCode(() -> analytics.dashboard(day, day, null, 999_999L, RevenueTimeGroup.DAY),
                ErrorCode.RESOURCE_NOT_FOUND);
        assertCode(() -> analytics.dashboard(day, day.plusDays(366), null, null, RevenueTimeGroup.DAY),
                ErrorCode.VALIDATION_ERROR);
    }

    private Booking booking(Movie movie, Room room, List<Seat> roomSeats, int seatCount, String amount) {
        Instant start = Instant.parse("2035-01-01T00:00:00Z").plusSeconds(3600L * (++showtimeOffset));
        Showtime showtime = showtimes.saveAndFlush(Showtime.builder().movie(movie).room(room)
                .startsAt(start).endsAt(start.plusSeconds(3600))
                .basePrice(new BigDecimal("75000.00")).vipSurcharge(BigDecimal.ZERO).build());
        Booking booking = bookings.saveAndFlush(Booking.builder()
                .bookingCode(UUID.randomUUID().toString().replace("-", ""))
                .user(customer)
                .showtime(showtime)
                .status(BookingStatus.CONFIRMED)
                .totalAmount(new BigDecimal(amount))
                .expiresAt(Instant.parse("2035-01-01T00:00:00Z"))
                .build());
        BigDecimal unit = new BigDecimal(amount).divide(BigDecimal.valueOf(seatCount), 2, RoundingMode.HALF_UP);
        for (int i = 0; i < seatCount; i++) {
            ShowtimeSeat row = inventory.saveAndFlush(ShowtimeSeat.builder()
                    .showtime(showtime).seat(roomSeats.get(i)).build());
            bookingSeats.saveAndFlush(BookingSeat.builder().booking(booking).showtimeSeat(row)
                    .ticketCode("T-" + UUID.randomUUID()).unitPrice(unit).build());
        }
        return booking;
    }

    private Booking paid(Movie movie, Room room, List<Seat> roomSeats, int seatCount, String amount, Instant paidAt) {
        Booking booking = booking(movie, room, roomSeats, seatCount, amount);
        success(booking, amount, paidAt);
        return booking;
    }

    private void success(Booking booking, String amount, Instant paidAt) {
        payments.saveAndFlush(Payment.builder().booking(booking).status(PaymentStatus.SUCCESS)
                .amount(new BigDecimal(amount)).idempotencyKey(UUID.randomUUID().toString())
                .paidAt(paidAt).build());
    }

    private void attempt(Booking booking, PaymentStatus status, String amount, Instant paidAt) {
        payments.saveAndFlush(Payment.builder().booking(booking).status(status)
                .amount(new BigDecimal(amount)).idempotencyKey(UUID.randomUUID().toString())
                .paidAt(paidAt).build());
    }

    private static Instant at(String iso) {
        return OffsetDateTime.parse(iso).toInstant();
    }

    private static BigDecimal sum(List<RevenueBreakdownRow> rows) {
        return rows.stream().map(row -> new BigDecimal(row.totalRevenue()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
