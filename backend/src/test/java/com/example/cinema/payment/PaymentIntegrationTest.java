package com.example.cinema.payment;

import com.example.cinema.auth.entity.*;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.auth.security.UserPrincipal;
import com.example.cinema.booking.dto.*;
import com.example.cinema.booking.entity.*;
import com.example.cinema.booking.repository.*;
import com.example.cinema.booking.service.*;
import com.example.cinema.catalog.entity.*;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.*;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.payment.dto.*;
import com.example.cinema.payment.entity.*;
import com.example.cinema.payment.repository.PaymentRepository;
import com.example.cinema.payment.service.PaymentService;
import com.example.cinema.report.service.RevenueService;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.*;
import com.example.cinema.ticket.dto.*;
import com.example.cinema.ticket.repository.TicketCheckinRepository;
import com.example.cinema.ticket.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TC-06/07/08/13/14/16/21/22/24: committed fixtures, independent transactions per worker, real MySQL. */
@SpringBootTest(properties = "app.booking.cleanup.enabled=false")
@EnabledIf("databaseAvailable")
class PaymentIntegrationTest {
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0.36");
    static final String LOCAL_URL = System.getenv("CINEMA_IT_JDBC_URL");
    static boolean databaseAvailable() {
        return LOCAL_URL != null && !LOCAL_URL.isBlank() || DockerClientFactory.instance().isDockerAvailable();
    }
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
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
    @AfterAll static void stopContainer() { if (MYSQL.isRunning()) MYSQL.stop(); }
    @Autowired PaymentService service;
    @Autowired BookingService bookingService;
    @Autowired BookingExpiryService expiry;
    @Autowired TicketService tickets;
    @Autowired RevenueService revenue;
    @Autowired BookingRepository bookings;
    @Autowired BookingSeatRepository selections;
    @Autowired PaymentRepository payments;
    @Autowired TicketCheckinRepository checkins;
    @Autowired ShowtimeRepository showtimes;
    @SpyBean ShowtimeSeatRepository inventory;
    @Autowired CinemaRepository cinemas;
    @Autowired RoomRepository rooms;
    @Autowired SeatRepository seats;
    @Autowired MovieRepository movies;
    @Autowired UserRepository users;
    @SpyBean DatabaseTime time;
    @SpyBean TicketCodes codes;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    Showtime showtime;
    Seat a1, a2, vip;
    UserPrincipal customer, other, admin, staff;

    @BeforeEach void fixture() {
        new TransactionTemplate(transactionManager).execute(status -> {
            var cinema = cinemas.saveAndFlush(Cinema.builder().name("Payment IT " + UUID.randomUUID()).address("Địa chỉ test").build());
            var room = rooms.saveAndFlush(Room.builder().cinema(cinema).name("Phòng payment").build());
            var movie = movies.saveAndFlush(Movie.builder().title("Payment IT movie").durationMinutes(60).status(MovieStatus.SHOWING).build());
            a1 = seats.saveAndFlush(Seat.builder().room(room).seatRow("A").seatNumber(1).build());
            a2 = seats.saveAndFlush(Seat.builder().room(room).seatRow("A").seatNumber(2).build());
            vip = seats.saveAndFlush(Seat.builder().room(room).seatRow("B").seatNumber(1).seatType(SeatType.VIP).build());
            Instant start = time.now().plusSeconds(7200);
            showtime = showtimes.saveAndFlush(Showtime.builder().movie(movie).room(room).startsAt(start).endsAt(start.plusSeconds(3600))
                    .basePrice(new BigDecimal("75000.00")).vipSurcharge(new BigDecimal("20000.00")).build());
            inventory.saveAllAndFlush(List.of(a1, a2, vip).stream().map(seat -> ShowtimeSeat.builder().showtime(showtime).seat(seat).build()).toList());
            customer = newCustomer(); other = newCustomer();
            admin = UserPrincipal.create(users.findByEmail("admin@cinema.com").orElseThrow());
            staff = UserPrincipal.create(users.findByEmail("staff@cinema.com").orElseThrow());
            return null;
        });
        authenticate(customer);
    }
    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test void successAtomicallyBooksEverySeatIssuesUniqueTicketsAndUsesSnapshots() {
        var booking = create(a1, vip);
        jdbc.update("update showtimes set base_price=1,vip_surcharge=2 where id=?", showtime.getId());
        var response = pay(booking.bookingId());
        assertThat(response.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(response.tickets()).hasSize(2).extracting(TicketResponse::ticketCode).doesNotHaveDuplicates();
        assertThat(response.tickets()).allSatisfy(ticket -> assertThat(ticket.ticketCode()).matches("[0-9a-f]{48}"));
        assertThat(payments.findByBookingId(booking.bookingId())).singleElement().satisfies(payment -> {
            assertThat(payment.getAmount()).isEqualByComparingTo("170000.00");
            assertThat(payment.getPaidAt()).isEqualTo(response.paidAt());
            assertThat(payment.getSuccessfulBookingId()).isEqualTo(booking.bookingId());
        });
        assertThat(bookings.findById(booking.bookingId()).orElseThrow().getConfirmedAt()).isEqualTo(response.paidAt());
        assertThat(inventory.findByCurrentBookingId(booking.bookingId())).hasSize(2).allSatisfy(row -> {
            assertThat(row.getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
            assertThat(row.getHoldExpiresAt()).isNull();
            assertThat(row.getVersion()).isEqualTo(2);
        });
        assertThat(tickets.tickets(booking.bookingId())).isEqualTo(response.tickets());
        assertCode(() -> bookingService.cancel(booking.bookingId()), ErrorCode.BOOKING_STATE_CONFLICT);
    }

    @Test void failedCanRetryWithNewKeyAndOldFailedResponseRemainsStableAfterSuccess() {
        var booking = create(a1);
        var failed = request(MockPaymentRequest.Result.FAILED);
        var first = service.pay(booking.bookingId(), failed);
        assertThat(first.status()).isEqualTo(BookingStatus.PENDING);
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        assertThat(selections.findByBookingId(booking.bookingId()).get(0).getTicketCode()).isNull();
        pay(booking.bookingId());
        assertThat(service.pay(booking.bookingId(), failed)).isEqualTo(first);
        assertThat(payments.findByBookingId(booking.bookingId())).hasSize(2).filteredOn(p -> p.getStatus() == PaymentStatus.SUCCESS).hasSize(1);
    }

    @Test void tenConcurrentSameKeyPaymentsReturnSameCodesAndExactlyOneSuccess() throws Exception {
        var booking = create(a1, vip);
        var request = request(MockPaymentRequest.Result.SUCCESS);
        var results = race(10, i -> outcome(customer, () -> service.pay(booking.bookingId(), request)));
        assertThat(results).allSatisfy(result -> assertThat(result.error()).isNull());
        assertThat(results.stream().map(Outcome::value).distinct()).hasSize(1);
        assertThat(payments.findByBookingId(booking.bookingId())).hasSize(1);
        assertThat(selections.findByBookingId(booking.bookingId())).hasSize(2);
    }

    @Test void concurrentDifferentKeysForSameBookingOnlyOneCanSucceed() throws Exception {
        var booking = create(a1);
        var results = race(10, i -> outcome(customer, () -> pay(booking.bookingId())));
        assertThat(results.stream().filter(r -> r.error() == null)).hasSize(1);
        assertThat(results.stream().filter(r -> r.error() != null).map(Outcome::error)).hasSize(9).containsOnly(ErrorCode.BOOKING_STATE_CONFLICT);
        assertThat(payments.findByBookingId(booking.bookingId())).hasSize(1);
    }

    @Test void globalKeyConcurrentAcrossBookingsRollsBackLosingConfirmation() throws Exception {
        var first = create(a1); var second = create(a2);
        var request = request(MockPaymentRequest.Result.SUCCESS);
        var results = race(2, i -> outcome(customer, () -> service.pay(i == 0 ? first.bookingId() : second.bookingId(), request)));
        assertThat(results.stream().filter(r -> r.error() == null)).hasSize(1);
        assertThat(results.stream().filter(r -> r.error() != null).map(Outcome::error)).containsExactly(ErrorCode.IDEMPOTENCY_CONFLICT);
        assertThat(payments.findByIdempotencyKey(request.idempotencyKey())).isPresent();
        assertThat(List.of(row(a1), row(a2))).filteredOn(r -> r.getStatus() == ShowtimeSeatStatus.BOOKED).hasSize(1);
        assertThat(List.of(row(a1), row(a2))).filteredOn(r -> r.getStatus() == ShowtimeSeatStatus.HELD).hasSize(1);
    }

    @Test void sameKeyChangedResultOrBookingConflicts() {
        var first = create(a1); var second = create(a2);
        var request = request(MockPaymentRequest.Result.FAILED);
        service.pay(first.bookingId(), request);
        assertCode(() -> service.pay(first.bookingId(), new MockPaymentRequest(MockPaymentRequest.Result.SUCCESS, request.idempotencyKey())), ErrorCode.IDEMPOTENCY_CONFLICT);
        assertCode(() -> service.pay(second.bookingId(), request), ErrorCode.IDEMPOTENCY_CONFLICT);
    }

    @Test void newKeyAfterConfirmedIsRejectedWhileOriginalSuccessReplaysEvenAfterTtl() {
        var booking = create(a1); var request = request(MockPaymentRequest.Result.SUCCESS);
        var first = service.pay(booking.bookingId(), request);
        doReturn(booking.expiresAt().plusSeconds(1)).when(time).now();
        assertThat(service.pay(booking.bookingId(), request)).isEqualTo(first);
        assertCode(() -> pay(booking.bookingId()), ErrorCode.BOOKING_STATE_CONFLICT);
    }

    @Test void paymentAtExpiryIsRejectedWithoutDependingOnCleanup() {
        var booking = create(a1);
        doReturn(booking.expiresAt()).when(time).now();
        assertCode(() -> pay(booking.bookingId()), ErrorCode.BOOKING_EXPIRED);
        assertNoPaymentOrTickets(booking.bookingId());
        assertThat(bookings.findById(booking.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.PENDING);
    }

    @Test void paymentJustBeforeExpirySucceeds() {
        var booking = create(a1);
        doReturn(booking.expiresAt().minusMillis(1)).when(time).now();
        assertThat(pay(booking.bookingId()).paymentStatus()).isEqualTo(PaymentStatus.SUCCESS);
    }

    @Test void expiredReclaimedSeatCannotBeConfirmedByPreviousOwner() {
        var old = create(a1);
        makeExpired(old.bookingId());
        authenticate(other); var newer = create(a1); authenticate(customer);
        assertCode(() -> pay(old.bookingId()), ErrorCode.BOOKING_EXPIRED);
        assertNoPaymentOrTickets(old.bookingId());
        assertThat(row(a1).getCurrentBookingId()).isEqualTo(newer.bookingId());
    }

    @Test void paymentAndCleanupRaceCannotLeaveHalfConfirmedState() throws Exception {
        var booking = create(a1); makeExpired(booking.bookingId());
        var results = race(2, i -> outcome(customer, () -> i == 0 ? pay(booking.bookingId()) : expiry.expire(booking.bookingId())));
        assertThat(results.get(0).error()).isEqualTo(ErrorCode.BOOKING_EXPIRED);
        assertThat(results.get(1).error()).isNull();
        assertNoPaymentOrTickets(booking.bookingId());
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
    }

    @Test void paymentAndCancelRaceHaveExactlyOneTerminalOutcome() throws Exception {
        var booking = create(a1);
        var results = race(2, i -> outcome(customer, () -> i == 0 ? pay(booking.bookingId()) : bookingService.cancel(booking.bookingId())));
        assertThat(results.stream().filter(r -> r.error() == null)).hasSize(1);
        assertThat(results.stream().filter(r -> r.error() != null).map(Outcome::error)).containsExactly(ErrorCode.BOOKING_STATE_CONFLICT);
        var state = bookings.findById(booking.bookingId()).orElseThrow().getStatus();
        if (state == BookingStatus.CONFIRMED) {
            assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
            assertThat(payments.findByBookingId(booking.bookingId())).hasSize(1);
        } else {
            assertThat(state).isEqualTo(BookingStatus.CANCELLED);
            assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
            assertNoPaymentOrTickets(booking.bookingId());
        }
    }

    @Test void everySeatMustStillBeHeldOwnedAndUnexpired() {
        var booking = create(a1, a2);
        jdbc.update("update showtime_seats set status='AVAILABLE', current_booking_id=null, hold_expires_at=null,version=version+1 where id=?", row(a2).getId());
        assertCode(() -> pay(booking.bookingId()), ErrorCode.BOOKING_STATE_CONFLICT);
        assertNoPaymentOrTickets(booking.bookingId());
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
    }

    @Test void expiredSeatTtlWithUnexpiredBookingIsRejected() {
        var booking = create(a1);
        jdbc.update("update showtime_seats set hold_expires_at=UTC_TIMESTAMP(3),version=version+1 where id=?", row(a1).getId());
        assertCode(() -> pay(booking.bookingId()), ErrorCode.BOOKING_STATE_CONFLICT);
        assertNoPaymentOrTickets(booking.bookingId());
    }

    @Test void mismatchedSnapshotTotalIsRejected() {
        var booking = create(a1);
        jdbc.update("update bookings set total_amount=1 where id=?", booking.bookingId());
        assertCode(() -> pay(booking.bookingId()), ErrorCode.BOOKING_AMOUNT_INVALID);
        assertNoPaymentOrTickets(booking.bookingId());
    }

    @Test void ticketCodeCollisionRollsBackPaymentBookingAndEverySeat() {
        var first = create(a1); var existingCode = pay(first.bookingId()).tickets().get(0).ticketCode();
        var second = create(a2, vip);
        doReturn(existingCode).when(codes).generate();
        assertThatThrownBy(() -> pay(second.bookingId())).isInstanceOf(DataIntegrityViolationException.class);
        assertNoPaymentOrTickets(second.bookingId());
        assertThat(bookings.findById(second.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.PENDING);
        assertThat(List.of(row(a2), row(vip))).allSatisfy(row -> assertThat(row.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD));
    }

    @Test void databaseGeneratedColumnRejectsSecondSuccessButAllowsMultipleFailedAttempts() {
        var booking = create(a1);
        service.pay(booking.bookingId(), request(MockPaymentRequest.Result.FAILED));
        service.pay(booking.bookingId(), request(MockPaymentRequest.Result.FAILED));
        pay(booking.bookingId());
        assertThatThrownBy(() -> jdbc.update("insert into payments(booking_id,method,status,amount,idempotency_key,paid_at) values(?,'MOCK','SUCCESS',75000,?,UTC_TIMESTAMP(3))",
                booking.bookingId(), UUID.randomUUID().toString())).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(payments.findByBookingId(booking.bookingId())).hasSize(3);
    }

    @Test void otherOwnerCannotReadTicketsPayOrReplayAndStaffCannotReadOwnerEndpoint() {
        var booking = create(a1); var request = request(MockPaymentRequest.Result.SUCCESS); service.pay(booking.bookingId(), request);
        authenticate(other);
        assertCode(() -> service.pay(booking.bookingId(), request), ErrorCode.RESOURCE_NOT_FOUND);
        assertCode(() -> tickets.tickets(booking.bookingId()), ErrorCode.RESOURCE_NOT_FOUND);
        authenticate(staff);
        assertThatThrownBy(() -> tickets.tickets(booking.bookingId())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> pay(booking.bookingId())).isInstanceOf(AccessDeniedException.class);
        authenticate(admin);
        assertThat(tickets.tickets(booking.bookingId())).hasSize(1);
        assertThatThrownBy(() -> pay(booking.bookingId())).isInstanceOf(AccessDeniedException.class);
    }

    @Test void pendingBookingHasNoReadableTicketsAndDirectServiceValidationIsEnforced() {
        var booking = create(a1);
        assertCode(() -> tickets.tickets(booking.bookingId()), ErrorCode.BOOKING_STATE_CONFLICT);
        assertThatThrownBy(() -> service.pay(booking.bookingId(), new MockPaymentRequest(null, " ")))
                .isInstanceOf(jakarta.validation.ConstraintViolationException.class);
        assertThatThrownBy(() -> tickets.checkin(new CheckinRequest("x"))).isInstanceOf(AccessDeniedException.class);
        authenticate(staff);
        assertThatThrownBy(() -> tickets.checkin(new CheckinRequest(" "))).isInstanceOf(jakarta.validation.ConstraintViolationException.class);
    }

    @Test void checkinRecordsAuthenticatedStaffAndDuplicateIsConflict() {
        var code = pay(create(a1).bookingId()).tickets().get(0).ticketCode();
        doReturn(showtime.getStartsAt()).when(time).now(); authenticate(staff);
        assertThat(tickets.checkin(new CheckinRequest(code)).result()).isEqualTo("CHECKED_IN");
        var ticketId = selections.findByTicketCode(code).orElseThrow().getId();
        var persisted = checkins.findByBookingSeatId(ticketId).orElseThrow();
        assertThat(persisted.getStaff().getId()).isEqualTo(staff.getId());
        assertThat(persisted.getCheckedInAt()).isEqualTo(showtime.getStartsAt());
        assertCode(() -> tickets.checkin(new CheckinRequest(code)), ErrorCode.TICKET_ALREADY_USED);
    }

    @Test void concurrentCheckinsHaveOneWinnerAndDatabaseAlsoEnforcesUnique() throws Exception {
        var code = pay(create(a1).bookingId()).tickets().get(0).ticketCode();
        doReturn(showtime.getStartsAt()).when(time).now();
        var results = race(10, i -> outcome(i % 2 == 0 ? staff : admin, () -> tickets.checkin(new CheckinRequest(code))));
        assertThat(results.stream().filter(r -> r.error() == null)).hasSize(1);
        assertThat(results.stream().filter(r -> r.error() != null).map(Outcome::error)).hasSize(9).containsOnly(ErrorCode.TICKET_ALREADY_USED);
        var ticketId = selections.findByTicketCode(code).orElseThrow().getId();
        assertThatThrownBy(() -> jdbc.update("insert into ticket_checkins(booking_seat_id,staff_id) values(?,?)", ticketId, staff.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest @ValueSource(longs = {-1800000, 3600000})
    void bothCheckinWindowBoundariesAreInclusive(long offsetMillis) {
        var code = pay(create(a1).bookingId()).tickets().get(0).ticketCode();
        doReturn(showtime.getStartsAt().plusMillis(offsetMillis)).when(time).now(); authenticate(staff);
        assertThat(tickets.checkin(new CheckinRequest(code)).result()).isEqualTo("CHECKED_IN");
    }

    @ParameterizedTest @ValueSource(longs = {-1800001, 3600001})
    void oneMillisecondOutsideCheckinWindowIsRejected(long offsetMillis) {
        var code = pay(create(a1).bookingId()).tickets().get(0).ticketCode();
        doReturn(showtime.getStartsAt().plusMillis(offsetMillis)).when(time).now(); authenticate(staff);
        assertCode(() -> tickets.checkin(new CheckinRequest(code)), ErrorCode.CHECKIN_TIME_INVALID);
        assertThat(checkins.existsByBookingSeatId(selections.findByTicketCode(code).orElseThrow().getId())).isFalse();
    }

    @Test void cancelledShowtimeAndInvalidTicketAreRejected() {
        var code = pay(create(a1).bookingId()).tickets().get(0).ticketCode();
        jdbc.update("update showtimes set status='CANCELLED' where id=?", showtime.getId());
        doReturn(showtime.getStartsAt()).when(time).now(); authenticate(staff);
        assertCode(() -> tickets.checkin(new CheckinRequest(code)), ErrorCode.CHECKIN_TIME_INVALID);
        assertCode(() -> tickets.checkin(new CheckinRequest("unknown")), ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test void nonConfirmedBookingCannotCheckinEvenIfCodeExists() {
        var booking = create(a1);
        jdbc.update("update booking_seats set ticket_code=? where booking_id=?", "fixture-" + booking.bookingId(), booking.bookingId());
        authenticate(staff);
        assertCode(() -> tickets.checkin(new CheckinRequest("fixture-" + booking.bookingId())), ErrorCode.BOOKING_STATE_CONFLICT);
    }

    @Test void revenueOnlyCountsSuccessByPaidAtInVietnamDaysWithHalfOpenEnd() {
        var first = create(a1); var second = create(a2); var third = create(vip);
        var date = LocalDate.of(2040, 1, 1).plusDays(first.bookingId() * 3);
        var from = date.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        doReturn(from).when(time).now();
        // Report fixtures use SQL because historical report dates are independent from hold TTL.
        insertReportPayment(first.bookingId(), "SUCCESS", "100.00", from.minusMillis(1));
        insertReportPayment(second.bookingId(), "SUCCESS", "200.00", from);
        insertReportPayment(third.bookingId(), "SUCCESS", "300.00", from.plusSeconds(86400));
        insertReportPayment(first.bookingId(), "FAILED", "900.00", from.plusSeconds(1));
        insertReportPayment(first.bookingId(), "INITIATED", "900.00", from.plusSeconds(1));
        authenticate(admin);
        var report = revenue.report(date, date);
        assertThat(report.totalRevenue()).isEqualByComparingTo("200.00");
        assertThat(report.successfulPayments()).isEqualTo(1);
        assertThat(report.currency()).isEqualTo("VND");
        assertThat(report.dailyRevenue()).singleElement().satisfies(day -> assertThat(day.date()).isEqualTo(date));
        assertThat(revenue.report(date, date.plusDays(1)).totalRevenue()).isEqualByComparingTo("500.00");
    }

    @Test void reportEmptyRangeIsZeroAndInvalidRangeOrRoleIsRejected() {
        assertThatThrownBy(() -> revenue.report(LocalDate.now(), LocalDate.now())).isInstanceOf(AccessDeniedException.class);
        authenticate(admin);
        var report = revenue.report(LocalDate.parse("2099-01-01"), LocalDate.parse("2099-01-01"));
        assertThat(report.totalRevenue()).isEqualByComparingTo("0.00");
        assertThat(report.successfulPayments()).isZero(); assertThat(report.dailyRevenue()).isEmpty();
        assertCode(() -> revenue.report(LocalDate.parse("2099-01-02"), LocalDate.parse("2099-01-01")), ErrorCode.VALIDATION_ERROR);
    }

    private void insertReportPayment(Long id, String status, String amount, Instant paidAt) {
        jdbc.update("insert into payments(booking_id,method,status,amount,idempotency_key,paid_at) values(?,'MOCK',?,?,?,?)",
                id, status, new BigDecimal(amount), UUID.randomUUID().toString(), Timestamp.from(paidAt));
    }
    private BookingResponse create(Seat... selected) {
        return bookingService.createBooking(new BookingCreateRequest(showtime.getId(), Arrays.stream(selected).map(Seat::getId).toList(), UUID.randomUUID().toString())).booking();
    }
    private MockPaymentRequest request(MockPaymentRequest.Result result) { return new MockPaymentRequest(result, UUID.randomUUID().toString()); }
    private PaymentResponse pay(Long id) { return service.pay(id, request(MockPaymentRequest.Result.SUCCESS)); }
    private UserPrincipal newCustomer() {
        return UserPrincipal.create(users.saveAndFlush(User.builder().fullName("Khách payment IT").email(UUID.randomUUID() + "@example.test")
                .passwordHash(users.findByEmail("customer1@cinema.com").orElseThrow().getPasswordHash()).build()));
    }
    private void authenticate(UserPrincipal principal) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
    private ShowtimeSeat row(Seat seat) { return inventory.findByShowtimeIdAndSeatId(showtime.getId(), seat.getId()).orElseThrow(); }
    private void makeExpired(Long id) {
        Instant past = time.now().minusSeconds(1);
        jdbc.update("update bookings set expires_at=? where id=?", Timestamp.from(past), id);
        jdbc.update("update showtime_seats set hold_expires_at=?,version=version+1 where current_booking_id=? and status='HELD'", Timestamp.from(past), id);
    }
    private void assertNoPaymentOrTickets(Long id) {
        assertThat(payments.findByBookingId(id)).isEmpty();
        assertThat(selections.findByBookingId(id)).allSatisfy(item -> assertThat(item.getTicketCode()).isNull());
    }
    private record Outcome(Object value, ErrorCode error) { }
    private Outcome outcome(UserPrincipal principal, Supplier<?> action) {
        authenticate(principal);
        try { return new Outcome(action.get(), null); }
        catch (AppException ex) { return new Outcome(null, ex.getErrorCode()); }
        finally { SecurityContextHolder.clearContext(); }
    }
    private <T> List<T> race(int count, IntFunction<T> action) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(count);
        CountDownLatch ready = new CountDownLatch(count), go = new CountDownLatch(1);
        List<Future<T>> futures = new ArrayList<>();
        try {
            for (int index = 0; index < count; index++) {
                int worker = index;
                futures.add(pool.submit(() -> { ready.countDown(); if (!go.await(15, TimeUnit.SECONDS)) throw new IllegalStateException("Latch timeout"); return action.apply(worker); }));
            }
            assertThat(ready.await(15, TimeUnit.SECONDS)).isTrue(); go.countDown();
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) results.add(future.get(60, TimeUnit.SECONDS));
            return results;
        } finally { go.countDown(); pool.shutdownNow(); }
    }
    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(AppException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
