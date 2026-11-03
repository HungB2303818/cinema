package com.example.cinema.booking;

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
import com.example.cinema.showtime.dto.ShowtimeRequest;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.*;
import com.example.cinema.showtime.service.ShowtimeService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
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
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** No test-thread transaction: fixtures are committed and each worker gets an independent DB transaction. */
@SpringBootTest(properties = "app.booking.cleanup.enabled=false")
@AutoConfigureMockMvc
@EnabledIf("databaseAvailable")
class BookingIntegrationTest {
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

    @Autowired BookingService service;
    @Autowired BookingExpiryService expiry;
    @Autowired ShowtimeService scheduleService;
    @Autowired BookingRepository bookings;
    @SpyBean BookingSeatRepository selections;
    @Autowired ShowtimeRepository showtimes;
    @Autowired ShowtimeSeatRepository inventory;
    @Autowired CinemaRepository cinemas;
    @Autowired RoomRepository rooms;
    @Autowired SeatRepository seats;
    @Autowired MovieRepository movies;
    @Autowired UserRepository users;
    @SpyBean DatabaseTime time;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired PlatformTransactionManager transactionManager;
    Showtime showtime;
    Seat a1, a2, vip, maintenance, foreign;
    UserPrincipal customer, other, admin;

    @BeforeEach void fixture() {
        new TransactionTemplate(transactionManager).execute(status -> {
            var cinema = cinemas.saveAndFlush(Cinema.builder().name("Booking IT " + UUID.randomUUID()).address("Địa chỉ test").build());
            var room = rooms.saveAndFlush(Room.builder().cinema(cinema).name("Phòng booking").build());
            var otherRoom = rooms.saveAndFlush(Room.builder().cinema(cinema).name("Phòng khác").build());
            var movie = movies.saveAndFlush(Movie.builder().title("Booking IT movie").durationMinutes(60).status(MovieStatus.SHOWING).build());
            a1 = seats.saveAndFlush(Seat.builder().room(room).seatRow("A").seatNumber(1).build());
            a2 = seats.saveAndFlush(Seat.builder().room(room).seatRow("A").seatNumber(2).build());
            vip = seats.saveAndFlush(Seat.builder().room(room).seatRow("B").seatNumber(1).seatType(SeatType.VIP).build());
            maintenance = seats.saveAndFlush(Seat.builder().room(room).seatRow("C").seatNumber(1).status(PhysicalSeatStatus.MAINTENANCE).build());
            foreign = seats.saveAndFlush(Seat.builder().room(otherRoom).seatRow("A").seatNumber(1).build());
            Instant start = time.now().plusSeconds(7200);
            showtime = showtimes.saveAndFlush(Showtime.builder().movie(movie).room(room).startsAt(start).endsAt(start.plusSeconds(3600))
                    .basePrice(new BigDecimal("75000.00")).vipSurcharge(new BigDecimal("20000.00")).build());
            inventory.saveAllAndFlush(List.of(a1, a2, vip).stream().map(seat -> ShowtimeSeat.builder().showtime(showtime).seat(seat).build()).toList());
            customer = newCustomer();
            other = newCustomer();
            admin = principal("admin@cinema.com");
            return null;
        });
        authenticate(customer);
    }
    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test void createsAtomicHoldWithDbTtlSnapshotPricesAndNoTickets() {
        var result = service.createBooking(request(a1, vip));
        var response = result.booking();
        assertThat(result.created()).isTrue();
        assertThat(response.status()).isEqualTo(BookingStatus.PENDING);
        assertThat(response.totalAmount()).isEqualByComparingTo("170000.00");
        var persisted = bookings.findById(response.bookingId()).orElseThrow();
        assertThat(Duration.between(persisted.getCreatedAt(), response.expiresAt())).isEqualTo(Duration.ofMinutes(5));
        assertThat(inventory.findByCurrentBookingId(response.bookingId())).hasSize(2).allSatisfy(row -> {
            assertThat(row.getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
            assertThat(row.getHoldExpiresAt()).isEqualTo(response.expiresAt());
            assertThat(row.getVersion()).isEqualTo(1);
        });
        assertThat(selections.findByBookingId(response.bookingId())).hasSize(2)
                .allSatisfy(item -> assertThat(item.getTicketCode()).isNull());
    }

    @Test void bookedSeatAndMultiSeatConflictLeaveNoPartialBookingOrHold() {
        long occupied = create(a2).bookingId();
        markConfirmed(occupied);
        assertCode(() -> service.createBooking(request(a1, a2, vip)), ErrorCode.SEAT_UNAVAILABLE);
        assertThat(countBookings()).isEqualTo(1);
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(row(vip).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(row(a2).getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
    }

    @Test void selectionInsertFailureRollsBackBookingAndAllHeldSeats() {
        doThrow(new DataIntegrityViolationException("Fixture write failure")).when(selections).saveAllAndFlush(anyList());
        assertThatThrownBy(() -> service.createBooking(request(a1, vip))).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(countBookings()).isZero();
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(row(vip).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
    }

    @Test void twentyRequestsForSameSeatHaveExactlyOneWinnerAndNoOrphanBookings() throws Exception {
        var results = race(20, index -> outcome(customer, () -> service.createBooking(request(a1))));
        assertThat(results.stream().filter(result -> result.error() == null).count()).isEqualTo(1);
        assertThat(results.stream().filter(result -> result.error() != null).map(Outcome::error).toList())
                .hasSize(19).containsOnly(ErrorCode.SEAT_UNAVAILABLE);
        assertThat(countBookings()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from booking_seats bs join bookings b on b.id=bs.booking_id where b.showtime_id=?",
                Long.class, showtime.getId())).isEqualTo(1);
        assertThat(row(a1).getCurrentBookingId()).isNotNull();
    }

    @Test void twentyConcurrentRetriesOfSameIntentReturnOneBooking() throws Exception {
        String key = UUID.randomUUID().toString();
        var results = race(20, index -> outcome(customer, () -> service.createBooking(new BookingCreateRequest(showtime.getId(),
                index % 2 == 0 ? List.of(a1.getId(), vip.getId()) : List.of(vip.getId(), a1.getId()), key))));
        assertThat(results).allSatisfy(result -> assertThat(result.error()).isNull());
        var responses = results.stream().map(result -> (BookingCreationResult) result.value()).toList();
        assertThat(responses.stream().filter(BookingCreationResult::created).count()).isEqualTo(1);
        assertThat(responses.stream().map(result -> result.booking().bookingId()).distinct().count()).isEqualTo(1);
        assertThat(countBookings()).isEqualTo(1);
        assertThat(selections.findByBookingId(responses.get(0).booking().bookingId())).hasSize(2);
    }

    @Test void oppositeSeatOrderRequestsUseSameLockOrderAndCannotPartiallyWin() throws Exception {
        var results = race(2, index -> outcome(customer, () -> service.createBooking(new BookingCreateRequest(showtime.getId(),
                index == 0 ? List.of(a1.getId(), vip.getId()) : List.of(vip.getId(), a1.getId()), UUID.randomUUID().toString()))));
        assertThat(results.stream().filter(result -> result.error() == null).count()).isEqualTo(1);
        assertThat(results.stream().filter(result -> result.error() != null).map(Outcome::error).toList()).containsExactly(ErrorCode.SEAT_UNAVAILABLE);
        assertThat(row(a1).getCurrentBookingId()).isEqualTo(row(vip).getCurrentBookingId());
        assertThat(countBookings()).isEqualTo(1);
    }

    @Test void independentSeatsCanBeHeldByConcurrentCustomers() throws Exception {
        var results = race(2, index -> outcome(index == 0 ? customer : other,
                () -> service.createBooking(request(index == 0 ? a1 : a2))));
        assertThat(results).allSatisfy(result -> assertThat(result.error()).isNull());
        assertThat(countBookings()).isEqualTo(2);
    }

    @Test void idempotencyRejectsChangedSeatSetOrShowtimeBeforeBusinessValidation() {
        var request = request(a1);
        service.createBooking(request);
        assertCode(() -> service.createBooking(new BookingCreateRequest(showtime.getId(), List.of(a2.getId()), request.clientRequestId())), ErrorCode.IDEMPOTENCY_CONFLICT);
        assertCode(() -> service.createBooking(new BookingCreateRequest(Long.MAX_VALUE, List.of(a1.getId()), request.clientRequestId())), ErrorCode.IDEMPOTENCY_CONFLICT);
        assertThat(countBookings()).isEqualTo(1);
    }

    @Test void idempotencyKeyIsScopedPerUser() {
        String key = UUID.randomUUID().toString();
        service.createBooking(new BookingCreateRequest(showtime.getId(), List.of(a1.getId()), key));
        authenticate(other);
        service.createBooking(new BookingCreateRequest(showtime.getId(), List.of(a2.getId()), key));
        assertThat(countBookings()).isEqualTo(2);
    }

    @Test void replayAfterCancelExpiryOrConfirmationNeverReholdsSeat() {
        var first = request(a1);
        var cancelled = service.createBooking(first).booking();
        service.cancel(cancelled.bookingId());
        assertThat(service.createBooking(first).booking().status()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        var second = request(a2);
        var expired = service.createBooking(second).booking();
        makeExpired(expired.bookingId());
        expiry.expire(expired.bookingId());
        assertThat(service.createBooking(second).booking().status()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(row(a2).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        var third = request(vip);
        var confirmed = service.createBooking(third).booking();
        markConfirmed(confirmed.bookingId());
        assertThat(service.createBooking(third).booking().status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(row(vip).getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
    }

    @Test void expiredHoldCanBeReclaimedBeforeCleanupAndOldJobCannotReleaseNewOwner() {
        var old = create(a1);
        makeExpired(old.bookingId());
        authenticate(other);
        var newer = create(a1);
        assertThat(expiry.expire(old.bookingId())).isTrue();
        assertThat(expiry.expire(old.bookingId())).isFalse();
        assertThat(row(a1).getCurrentBookingId()).isEqualTo(newer.bookingId());
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        assertThat(selections.findByBookingId(old.bookingId())).hasSize(1);
        assertThat(selections.findByBookingId(newer.bookingId())).hasSize(1);
        assertThat(bookings.findById(old.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.EXPIRED);
    }

    @Test void cleanupAndReclaimRacePreserveNewOwner() throws Exception {
        var old = create(a1);
        makeExpired(old.bookingId());
        var results = race(2, index -> outcome(other,
                () -> index == 0 ? expiry.expire(old.bookingId()) : service.createBooking(request(a1))));
        assertThat(results).allSatisfy(result -> assertThat(result.error()).isNull());
        var newer = ((BookingCreationResult) results.get(1).value()).booking();
        assertThat(row(a1).getCurrentBookingId()).isEqualTo(newer.bookingId());
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
    }

    @Test void repeatedConcurrentCleanupOnlyExpiresOnce() throws Exception {
        var booking = create(a1, a2);
        makeExpired(booking.bookingId());
        var results = race(10, index -> expiry.expire(booking.bookingId()));
        assertThat(results.stream().filter(Boolean::booleanValue).count()).isEqualTo(1);
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(row(a2).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        assertThat(selections.findByBookingId(booking.bookingId())).hasSize(2);
    }

    @Test void cleanupBatchProcessesExpiredPendingButNeverConfirmed() {
        var expired = create(a1);
        makeExpired(expired.bookingId());
        var confirmed = create(vip);
        markConfirmed(confirmed.bookingId());
        expiry.cleanupBatch();
        assertThat(bookings.findById(expired.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(bookings.findById(confirmed.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(row(vip).getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
    }

    @Test void ownerCancellationIsIdempotentAndPreservesSelectionHistory() {
        var booking = create(a1, vip);
        assertThat(service.cancel(booking.bookingId()).releasedSeatCount()).isEqualTo(2);
        assertThat(service.cancel(booking.bookingId()).releasedSeatCount()).isZero();
        assertThat(bookings.findById(booking.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(row(a1).getCurrentBookingId()).isNull();
        assertThat(selections.findByBookingId(booking.bookingId())).hasSize(2);
    }

    @Test void concurrentCancellationReleasesEachSeatOnlyOnce() throws Exception {
        var booking = create(a1);
        var results = race(2, index -> outcome(customer, () -> service.cancel(booking.bookingId())));
        assertThat(results).allSatisfy(result -> assertThat(result.error()).isNull());
        assertThat(results.stream().mapToInt(result -> ((BookingCancelResponse) result.value()).releasedSeatCount()).sum()).isEqualTo(1);
    }

    @Test void cancelVersusNewHoldCannotReleaseNewCustomerSeat() throws Exception {
        var old = create(a1);
        var results = race(2, index -> index == 0 ? outcome(customer, () -> service.cancel(old.bookingId()))
                : outcome(other, () -> service.createBooking(request(a1))));
        assertThat(results.get(0).error()).isNull();
        if (results.get(1).error() == null) {
            assertThat(row(a1).getCurrentBookingId()).isEqualTo(((BookingCreationResult) results.get(1).value()).booking().bookingId());
            assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        } else {
            assertThat(results.get(1).error()).isEqualTo(ErrorCode.SEAT_UNAVAILABLE);
            assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
        }
    }

    @Test void expiredPendingCancelReturns409WithoutPretendingToPersistExpiry() {
        var booking = create(a1);
        makeExpired(booking.bookingId());
        assertCode(() -> service.cancel(booking.bookingId()), ErrorCode.BOOKING_EXPIRED);
        assertThat(bookings.findById(booking.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.PENDING);
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
        expiry.expire(booking.bookingId());
        assertThat(bookings.findById(booking.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.EXPIRED);
    }

    @Test void confirmedCancelIsRejectedWithoutReleasingBookedSeat() {
        var booking = create(a1);
        markConfirmed(booking.bookingId());
        assertCode(() -> service.cancel(booking.bookingId()), ErrorCode.BOOKING_STATE_CONFLICT);
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.BOOKED);
    }

    @Test void wrongOwnerGets404ForReadAndCancelWhileAdminMayReadOnly() throws Exception {
        var booking = create(a1);
        authenticate(other);
        assertCode(() -> service.detail(booking.bookingId()), ErrorCode.RESOURCE_NOT_FOUND);
        assertCode(() -> service.cancel(booking.bookingId()), ErrorCode.RESOURCE_NOT_FOUND);
        mvc.perform(get("/api/bookings/{id}", booking.bookingId()).with(user(other))).andExpect(status().isNotFound());
        authenticate(admin);
        assertThat(service.detail(booking.bookingId()).bookingId()).isEqualTo(booking.bookingId());
        assertThatThrownBy(() -> service.cancel(booking.bookingId())).isInstanceOf(AccessDeniedException.class);
    }

    @Test void historyIsOwnerScopedPaginatedAndDoesNotExposeInventoryOwnerOrTickets() throws Exception {
        var booking = create(a1);
        makeExpired(booking.bookingId());
        authenticate(other);
        var theirs = create(vip);
        var page = service.history(0, 100, "startsAt,asc");
        assertThat(page.content()).noneSatisfy(item -> assertThat(item.bookingId()).isEqualTo(booking.bookingId()));
        assertThat(page.content()).anySatisfy(item -> assertThat(item.bookingId()).isEqualTo(theirs.bookingId()));
        mvc.perform(get("/api/bookings/{id}", booking.bookingId()).with(user(customer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.effectiveStatus").value("EXPIRED"))
                .andExpect(jsonPath("$.seats[0].unitPrice").value(75000))
                .andExpect(jsonPath("$.seats[0].currentBookingId").doesNotExist())
                .andExpect(jsonPath("$.seats[0].ticketCode").doesNotExist());
        assertThat(bookings.findById(booking.bookingId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.PENDING);
    }

    @Test void ignoresForgedUserAndPricesAndReturns201Then200ForHttpRetry() throws Exception {
        String key = UUID.randomUUID().toString();
        String json = "{\"showtimeId\":" + showtime.getId() + ",\"seatIds\":[" + a1.getId() +
                "],\"clientRequestId\":\"" + key + "\",\"userId\":" + other.getId() + ",\"totalAmount\":1}";
        mvc.perform(post("/api/bookings").with(user(customer)).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.totalAmount").value(75000));
        mvc.perform(post("/api/bookings").with(user(customer)).contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isOk());
        var stored = bookings.findByUserIdAndClientRequestId(customer.getId(), key).orElseThrow();
        assertThat(stored.getUser().getId()).isEqualTo(customer.getId());
        assertThat(bookings.findByUserIdAndClientRequestId(other.getId(), key)).isEmpty();
    }

    @Test void rejectsCrossRoomMaintenanceAndMissingInventoryWithoutWritingBooking() {
        assertCode(() -> service.createBooking(request(a1, foreign)), ErrorCode.SEAT_NOT_IN_ROOM);
        assertCode(() -> service.createBooking(request(maintenance)), ErrorCode.SEAT_NOT_BOOKABLE);
        jdbc.update("delete from showtime_seats where showtime_id=? and seat_id=?", showtime.getId(), a2.getId());
        assertCode(() -> service.createBooking(request(a2)), ErrorCode.SEAT_NOT_BOOKABLE);
        assertThat(countBookings()).isZero();
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
    }

    @Test void hiddenCancelledAndMaintenanceShowtimesCannotBeBooked() {
        jdbc.update("update showtimes set status='CANCELLED' where id=?", showtime.getId());
        assertCode(() -> service.createBooking(request(a1)), ErrorCode.SHOWTIME_UNAVAILABLE);
        jdbc.update("update showtimes set status='SCHEDULED' where id=?", showtime.getId());
        jdbc.update("update rooms set status='MAINTENANCE' where id=?", showtime.getRoom().getId());
        assertCode(() -> service.createBooking(request(a1)), ErrorCode.ROOM_UNAVAILABLE);
        jdbc.update("update rooms set status='ACTIVE' where id=?", showtime.getRoom().getId());
        jdbc.update("update movies set status='HIDDEN' where id=?", showtime.getMovie().getId());
        assertCode(() -> service.createBooking(request(a1)), ErrorCode.RESOURCE_NOT_FOUND);
        assertThat(countBookings()).isZero();
    }

    @Test void cutoffAllowsOneMillisecondBeforeButRejectsAtAndAfterBoundary() {
        Instant cutoff = showtime.getStartsAt().minusSeconds(600);
        doReturn(cutoff.minusMillis(1)).when(time).now();
        create(a1);
        doReturn(cutoff).when(time).now();
        assertCode(() -> service.createBooking(request(a2)), ErrorCode.BOOKING_CUTOFF_PASSED);
        doReturn(cutoff.plusMillis(1)).when(time).now();
        assertCode(() -> service.createBooking(request(a2)), ErrorCode.BOOKING_CUTOFF_PASSED);
        assertThat(countBookings()).isEqualTo(1);
    }

    @Test void rechecksCutoffAfterInventoryLocksAndRollsBackInsertedBooking() {
        Instant cutoff = showtime.getStartsAt().minusSeconds(600);
        doReturn(cutoff.minusMillis(1), cutoff).when(time).now();
        assertCode(() -> service.createBooking(request(a1)), ErrorCode.BOOKING_CUTOFF_PASSED);
        assertThat(countBookings()).isZero();
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
    }

    @Test void doesNotCreateHoldIfOwnTtlExpiredWhileWaitingForLocks() {
        Instant now = time.now();
        doReturn(now, now.plusSeconds(300)).when(time).now();
        assertCode(() -> service.createBooking(request(a1)), ErrorCode.BOOKING_EXPIRED);
        assertThat(countBookings()).isZero();
    }

    @Test void expiryAtExactBoundaryIsInvalidEvenWithoutScheduledCleanup() {
        var booking = create(a1);
        doReturn(booking.expiresAt()).when(time).now();
        assertThat(service.detail(booking.bookingId()).effectiveStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertCode(() -> service.cancel(booking.bookingId()), ErrorCode.BOOKING_EXPIRED);
        assertThat(expiry.expire(booking.bookingId())).isTrue();
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
    }

    @Test void priceSnapshotsAreImmutableEvenIfSchedulePricesChangeOutsideAdminPolicy() {
        var booking = create(a1, vip);
        authenticate(admin);
        assertCode(() -> scheduleService.update(showtime.getId(), new ShowtimeRequest(showtime.getMovie().getId(), showtime.getRoom().getId(),
                showtime.getStartsAt(), showtime.getEndsAt(), 15, BigDecimal.ONE, BigDecimal.ZERO)), ErrorCode.RESOURCE_STATE_CONFLICT);
        // Deliberately bypass the admin guard in a fixture to prove selection prices do not depend on current schedule prices.
        jdbc.update("update showtimes set base_price=1,vip_surcharge=1 where id=?", showtime.getId());
        authenticate(customer);
        var detail = service.detail(booking.bookingId());
        assertThat(detail.totalAmount()).isEqualByComparingTo("170000");
        assertThat(detail.seats()).extracting(BookingDetailResponse.SeatItem::unitPrice)
                .usingElementComparator(BigDecimal::compareTo).containsExactly(new BigDecimal("75000"), new BigDecimal("95000"));
    }

    @Test void rejectsAmountOverflowWithoutPartialHolds() {
        jdbc.update("update showtimes set base_price=6000000000,vip_surcharge=0 where id=?", showtime.getId());
        assertCode(() -> service.createBooking(request(a1, a2)), ErrorCode.BOOKING_AMOUNT_INVALID);
        assertThat(countBookings()).isZero();
        assertThat(row(a1).getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
    }

    @Test void serviceValidationAndRoleChecksCannotBeBypassedByDirectCall() {
        assertThatThrownBy(() -> service.createBooking(new BookingCreateRequest(showtime.getId(), List.of(a1.getId(), a1.getId()), "k")))
                .isInstanceOf(jakarta.validation.ConstraintViolationException.class);
        authenticate(admin);
        assertThatThrownBy(() -> service.createBooking(request(a1))).isInstanceOf(AccessDeniedException.class);
        assertThat(countBookings()).isZero();
    }

    private BookingCreateRequest request(Seat... selected) {
        return new BookingCreateRequest(showtime.getId(), Arrays.stream(selected).map(Seat::getId).toList(), UUID.randomUUID().toString());
    }
    private BookingResponse create(Seat... selected) { return service.createBooking(request(selected)).booking(); }
    private UserPrincipal principal(String email) { return UserPrincipal.create(users.findByEmail(email).orElseThrow()); }
    private UserPrincipal newCustomer() {
        String fixtureHash = users.findByEmail("customer1@cinema.com").orElseThrow().getPasswordHash();
        return UserPrincipal.create(users.saveAndFlush(User.builder().fullName("Khách test")
                .email(UUID.randomUUID() + "@example.test").passwordHash(fixtureHash).build()));
    }
    private void authenticate(UserPrincipal principal) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
    private ShowtimeSeat row(Seat seat) { return inventory.findByShowtimeIdAndSeatId(showtime.getId(), seat.getId()).orElseThrow(); }
    private long countBookings() { return jdbc.queryForObject("select count(*) from bookings where showtime_id=?", Long.class, showtime.getId()); }
    private void makeExpired(Long id) {
        Instant past = time.now().minusSeconds(1);
        jdbc.update("update bookings set expires_at=? where id=?", Timestamp.from(past), id);
        jdbc.update("update showtime_seats set hold_expires_at=?, version=version+1 where current_booking_id=? and status='HELD'", Timestamp.from(past), id);
    }
    private void markConfirmed(Long id) {
        // Fixture for cancellation rules only; payment/ticket issuance is intentionally outside TASK-09..12.
        jdbc.update("update bookings set status='CONFIRMED',confirmed_at=UTC_TIMESTAMP(3) where id=?", id);
        jdbc.update("update showtime_seats set status='BOOKED',hold_expires_at=null,version=version+1 where current_booking_id=?", id);
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
            assertThat(ready.await(15, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) results.add(future.get(60, TimeUnit.SECONDS));
            return results;
        } finally { go.countDown(); pool.shutdownNow(); }
    }
    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(AppException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
