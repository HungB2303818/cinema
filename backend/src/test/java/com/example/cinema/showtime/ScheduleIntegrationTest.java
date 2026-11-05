package com.example.cinema.showtime;

import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.*;
import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.catalog.entity.*;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.dto.*;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.*;
import com.example.cinema.cinema.service.CinemaService;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.*;
import com.example.cinema.showtime.service.ShowtimeService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.booking.cleanup.enabled=false")
@AutoConfigureMockMvc
@WithMockUser(roles = "ADMIN")
@Transactional
@EnabledIf("databaseAvailable")
class ScheduleIntegrationTest {
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0.36");
    static final String LOCAL_URL = System.getenv("CINEMA_IT_JDBC_URL");

    static boolean databaseAvailable() {
        return LOCAL_URL != null && !LOCAL_URL.isBlank() || DockerClientFactory.instance().isDockerAvailable();
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        if (LOCAL_URL != null && !LOCAL_URL.isBlank()) {
            // Explicit opt-in only; use a dedicated disposable database, never a development/production schema.
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

    @Autowired CinemaRepository cinemas;
    @Autowired RoomRepository rooms;
    @Autowired SeatRepository seats;
    @Autowired MovieRepository movies;
    @Autowired ShowtimeRepository showtimes;
    @SpyBean ShowtimeSeatRepository inventory;
    @Autowired BookingRepository bookings;
    @Autowired UserRepository users;
    @Autowired ShowtimeService service;
    @Autowired CinemaService cinemaService;
    @Autowired DatabaseTime time;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager transactionManager;
    Room room;
    Movie movie;
    final Instant start = Instant.parse("2026-11-10T12:00:00Z");

    @BeforeEach void fixture() {
        Cinema cinema = cinemas.saveAndFlush(Cinema.builder().name("IT " + UUID.randomUUID()).address("Địa chỉ test").build());
        room = rooms.saveAndFlush(Room.builder().cinema(cinema).name("Phòng IT").build());
        movie = movies.saveAndFlush(Movie.builder().title("IT movie " + UUID.randomUUID())
                .durationMinutes(60).status(MovieStatus.SHOWING).build());
        seats.saveAllAndFlush(List.of(
                Seat.builder().room(room).seatRow("A").seatNumber(1).build(),
                Seat.builder().room(room).seatRow("B").seatNumber(1).seatType(SeatType.VIP).build(),
                Seat.builder().room(room).seatRow("C").seatNumber(1).status(PhysicalSeatStatus.MAINTENANCE).build()));
    }

    @Test void createsOnlyActiveSeatInventoryInCorrectRoom() {
        var created = service.create(request(start));
        assertThat(created.createdSeatCount()).isEqualTo(2);
        var items = inventory.findByShowtimeId(created.showtime().id());
        assertThat(items).hasSize(2).allSatisfy(item -> {
            assertThat(item.getSeat().getRoom().getId()).isEqualTo(room.getId());
            assertThat(item.getSeat().getStatus()).isEqualTo(PhysicalSeatStatus.ACTIVE);
            assertThat(item.getStatus()).isEqualTo(ShowtimeSeatStatus.AVAILABLE);
            assertThat(item.getCurrentBookingId()).isNull();
            assertThat(item.getHoldExpiresAt()).isNull();
        });
    }

    @Test @WithMockUser(roles = "CUSTOMER")
    void serviceLayerAlsoEnforcesAdminAuthorization() {
        assertThatThrownBy(() -> service.create(request(start)))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        assertThatThrownBy(() -> cinemaService.createRoom(new RoomRequest(room.getCinema().getId(), "Không có quyền", RoomStatus.ACTIVE)))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }

    @Test void supportsFullUnsignedSmallintRangeWithoutOverflow() {
        var added = cinemaService.createSeats(room.getId(), new SeatBatchRequest(List.of(
                new SeatRequest("D", 65535, SeatType.STANDARD, PhysicalSeatStatus.ACTIVE))));
        movie.setDurationMinutes(65535);
        movies.flush();
        var created = service.create(new ShowtimeRequest(movie.getId(), room.getId(), start,
                start.plusSeconds(65535L * 60), 65535, BigDecimal.ZERO, BigDecimal.ZERO));
        em.clear();
        assertThat(seats.findById(added.get(0).id()).orElseThrow().getSeatNumber()).isEqualTo(65535);
        assertThat(movies.findById(movie.getId()).orElseThrow().getDurationMinutes()).isEqualTo(65535);
        assertThat(showtimes.findById(created.showtime().id()).orElseThrow().getCleanupMinutes()).isEqualTo(65535);
    }

    @Test void rejectsOverlapIncludingBothCleanupIntervalsAndAllowsExactBoundary() {
        service.create(request(start));
        assertCode(() -> service.create(request(start.plusSeconds(3600))), ErrorCode.SHOWTIME_OVERLAP);
        assertCode(() -> service.create(request(start.minusSeconds(3600))), ErrorCode.SHOWTIME_OVERLAP);
        var adjacent = service.create(request(start.plusSeconds(4500)));
        assertThat(adjacent.createdSeatCount()).isEqualTo(2);
    }

    @Test void sameRoomUpdatePreservesInventoryAndExcludesItselfFromOverlap() {
        var created = service.create(request(start));
        List<Long> originalIds = inventory.findByShowtimeId(created.showtime().id()).stream().map(ShowtimeSeat::getId).toList();
        service.update(created.showtime().id(), request(start.plusSeconds(3600)));
        assertThat(inventory.findByShowtimeId(created.showtime().id())).extracting(ShowtimeSeat::getId).containsExactlyElementsOf(originalIds);
    }

    @Test void movingUnbookedShowtimeRebuildsInventoryForNewRoom() {
        var created = service.create(request(start));
        Room other = rooms.saveAndFlush(Room.builder().cinema(room.getCinema()).name("Phòng khác").build());
        seats.saveAndFlush(Seat.builder().room(other).seatRow("D").seatNumber(1).build());
        var changed = service.update(created.showtime().id(), new ShowtimeRequest(movie.getId(), other.getId(), start,
                start.plusSeconds(3600), 15, new BigDecimal("75000"), new BigDecimal("20000")));
        assertThat(changed.roomId()).isEqualTo(other.getId());
        assertThat(inventory.findByShowtimeId(changed.id())).hasSize(1).allSatisfy(item ->
                assertThat(item.getSeat().getRoom().getId()).isEqualTo(other.getId()));
    }

    @Test void refusesUpdateEvenWhenOnlyExpiredBookingExists() {
        var created = service.create(request(start));
        booking(created.showtime().id(), BookingStatus.EXPIRED);
        assertCode(() -> service.update(created.showtime().id(), request(start.plusSeconds(3600))), ErrorCode.RESOURCE_STATE_CONFLICT);
        assertThat(showtimes.findById(created.showtime().id()).orElseThrow().getStartsAt()).isEqualTo(start);
        assertThat(inventory.findByShowtimeId(created.showtime().id())).hasSize(2);
    }

    @Test void roomAndSeatMaintenanceAreBlockedAfterScheduleCreation() {
        service.create(request(start));
        Seat seat = seats.findByRoomIdOrderBySeatRowAscSeatNumberAsc(room.getId()).get(0);
        assertCode(() -> cinemaService.updateSeat(room.getId(), seat.getId(),
                new SeatRequest("A", 1, SeatType.VIP, PhysicalSeatStatus.MAINTENANCE)), ErrorCode.RESOURCE_STATE_CONFLICT);
        assertCode(() -> cinemaService.updateRoom(room.getId(),
                new RoomRequest(room.getCinema().getId(), "Đổi tên", RoomStatus.MAINTENANCE)), ErrorCode.RESOURCE_STATE_CONFLICT);
    }

    @Test void duplicateSeatBatchRollsBackCompletely() {
        assertCode(() -> cinemaService.createSeats(room.getId(), new SeatBatchRequest(List.of(
                new SeatRequest("D", 1, SeatType.STANDARD, PhysicalSeatStatus.ACTIVE),
                new SeatRequest("a", 1, SeatType.STANDARD, PhysicalSeatStatus.ACTIVE)))), ErrorCode.DUPLICATE_RESOURCE);
        assertThat(seats.findByRoomIdAndSeatRowAndSeatNumber(room.getId(), "D", 1)).isEmpty();
    }

    @Test void publicScheduleUsesHalfOpenVietnamDayAndFiltersVisibility() throws Exception {
        Instant dayStart = Instant.parse("2026-11-09T17:00:00Z");
        service.create(request(dayStart));
        service.create(request(dayStart.plusSeconds(86400)));
        var page = service.schedule(movie.getId(), LocalDate.of(2026, 11, 10), room.getCinema().getId(), 0, 20, "startsAt,asc");
        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content().get(0).startsAt()).isEqualTo(dayStart);
        assertThat(service.schedule(movie.getId(), LocalDate.of(2026, 11, 10), Long.MAX_VALUE, 0, 20, "id,asc").content()).isEmpty();
        mvc.perform(get("/api/movies/{id}/showtimes", movie.getId()).param("date", "2026-11-10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].startsAt").value("2026-11-09T17:00:00Z"));
        movie.setStatus(MovieStatus.HIDDEN);
        movies.flush();
        assertCode(() -> service.schedule(movie.getId(), LocalDate.of(2026, 11, 10), null, 0, 20, "id,asc"), ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test void publicCinemaScheduleUsesHalfOpenVietnamDayAndPaginatesByMovie() throws Exception {
        Instant dayStart = Instant.parse("2026-11-09T17:00:00Z");
        service.create(request(dayStart));
        service.create(request(dayStart.plusSeconds(86400))); // Next day in VN time

        // Second movie in same cinema, same room, different time
        Movie movie2 = movies.saveAndFlush(Movie.builder().title("IT movie 2 " + UUID.randomUUID())
                .durationMinutes(60).status(MovieStatus.SHOWING).build());
        service.create(new ShowtimeRequest(movie2.getId(), room.getId(), dayStart.plusSeconds(7200),
                dayStart.plusSeconds(10800), 15, new BigDecimal("80000"), BigDecimal.ZERO));

        var page = service.cinemaSchedule(room.getCinema().getId(), LocalDate.of(2026, 11, 10), 0, 20);
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.content()).hasSize(2);

        // Test through HTTP MVC endpoint
        mvc.perform(get("/api/cinemas/{id}/showtimes", room.getCinema().getId()).param("date", "2026-11-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].movie.id").exists())
                .andExpect(jsonPath("$.content[0].showtimes[0].startsAt").value("2026-11-09T17:00:00Z"));

        // Reject custom sort
        mvc.perform(get("/api/cinemas/{id}/showtimes", room.getCinema().getId())
                        .param("date", "2026-11-10").param("sort", "startsAt,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test void cinemaSchedulePaginatesUniqueMoviesWithStableOrderForMatchingTitles() throws Exception {
        Instant dayStart = Instant.parse("2026-11-09T17:00:00Z");
        movie.setTitle("Same title " + UUID.randomUUID());
        movies.flush();
        var first = service.create(request(dayStart));
        service.create(request(dayStart.plusSeconds(7200)));
        Movie secondMovie = movies.saveAndFlush(Movie.builder().title(movie.getTitle())
                .durationMinutes(60).status(MovieStatus.SHOWING).build());
        service.create(new ShowtimeRequest(secondMovie.getId(), room.getId(), dayStart.plusSeconds(14400),
                dayStart.plusSeconds(18000), 15, new BigDecimal("80000"), BigDecimal.ZERO));
        Long cinemaId = room.getCinema().getId();
        em.clear();

        // The first page has two showtimes, but only one movie; force the count query with size=1.
        mvc.perform(get("/api/cinemas/{id}/showtimes", cinemaId)
                        .param("date", "2026-11-10").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].movie.id").value(first.showtime().movieId()))
                .andExpect(jsonPath("$.content[0].showtimes.length()").value(2));
        mvc.perform(get("/api/cinemas/{id}/showtimes", cinemaId)
                        .param("date", "2026-11-10").param("size", "1").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].movie.id").value(secondMovie.getId()));
    }

    @Test void seatMapUsesDatabaseTimeAndDoesNotModifyExpiredHoldOrLeakOwner() throws Exception {
        var created = service.create(request(start));
        Booking booking = booking(created.showtime().id(), BookingStatus.PENDING);
        var rows = inventory.findByShowtimeId(created.showtime().id());
        rows.get(0).setStatus(ShowtimeSeatStatus.HELD);
        rows.get(0).setCurrentBookingId(booking.getId());
        rows.get(0).setHoldExpiresAt(time.now().minusSeconds(1));
        rows.get(1).setStatus(ShowtimeSeatStatus.HELD);
        rows.get(1).setCurrentBookingId(booking.getId());
        rows.get(1).setHoldExpiresAt(time.now().plusSeconds(300));
        inventory.flush();
        mvc.perform(get("/api/showtimes/{id}/seats", created.showtime().id()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.seats[0].status").value("AVAILABLE"))
                .andExpect(jsonPath("$.seats[1].status").value("HELD"))
                .andExpect(jsonPath("$.seats[0].price").value(75000))
                .andExpect(jsonPath("$.seats[1].price").value(95000))
                .andExpect(jsonPath("$.seats[0].currentBookingId").doesNotExist())
                .andExpect(jsonPath("$.seats[0].holdExpiresAt").doesNotExist())
                .andExpect(jsonPath("$.seats[0].ticketCode").doesNotExist());
        em.clear();
        assertThat(inventory.findByShowtimeId(created.showtime().id()).get(0).getStatus()).isEqualTo(ShowtimeSeatStatus.HELD);
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void inventoryFailureRollsBackShowtimeInsert() {
        doThrow(new DataIntegrityViolationException("Simulated inventory failure")).when(inventory).saveAllAndFlush(anyList());
        assertThatThrownBy(() -> service.create(request(start))).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("select count(*) from showtimes where room_id = ?", Long.class, room.getId())).isZero();
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentOverlappingScheduleCreationHasExactlyOneWinner() throws Exception {
        List<ErrorCode> results = race(() -> service.create(request(start)));
        assertThat(results.stream().filter(Objects::isNull).count()).isEqualTo(1);
        assertThat(results.stream().filter(Objects::nonNull).toList()).containsExactly(ErrorCode.SHOWTIME_OVERLAP);
        assertThat(jdbc.queryForObject("select count(*) from showtimes where room_id = ?", Long.class, room.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from showtime_seats ss join showtimes s on s.id=ss.showtime_id where s.room_id=?",
                Long.class, room.getId())).isEqualTo(2);
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentSeatInitializationCannotDuplicatePosition() throws Exception {
        List<ErrorCode> results = race(() -> cinemaService.createSeats(room.getId(), new SeatBatchRequest(List.of(
                new SeatRequest("D", 1, SeatType.STANDARD, PhysicalSeatStatus.ACTIVE)))));
        assertThat(results.stream().filter(Objects::isNull).count()).isEqualTo(1);
        assertThat(results.stream().filter(Objects::nonNull).toList()).containsExactly(ErrorCode.DUPLICATE_RESOURCE);
        assertThat(jdbc.queryForObject("select count(*) from seats where room_id=? and seat_row='D'", Long.class, room.getId())).isEqualTo(1);
    }

    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void sharedBookingGuardMakesConcurrentScheduleEditSeeCommittedHistory() throws Exception {
        Long id = service.create(request(start)).showtime().id();
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch bookingLocked = new CountDownLatch(1);
        CountDownLatch releaseBooking = new CountDownLatch(1);
        try {
            Future<?> booked = executor.submit(() -> new TransactionTemplate(transactionManager).execute(status -> {
                showtimes.findByIdForBooking(id).orElseThrow();
                booking(id, BookingStatus.PENDING);
                bookingLocked.countDown();
                await(releaseBooking);
                return null;
            }));
            assertThat(bookingLocked.await(10, TimeUnit.SECONDS)).isTrue();
            Future<ErrorCode> updated = executor.submit(() -> asAdmin(() -> service.update(id, request(start.plusSeconds(3600)))));
            releaseBooking.countDown();
            booked.get(15, TimeUnit.SECONDS);
            assertThat(updated.get(15, TimeUnit.SECONDS)).isEqualTo(ErrorCode.RESOURCE_STATE_CONFLICT);
        } finally {
            releaseBooking.countDown();
            executor.shutdownNow();
        }
    }

    private List<ErrorCode> race(Supplier<?> operation) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            Callable<ErrorCode> task = () -> { ready.countDown(); await(go); return asAdmin(operation); };
            Future<ErrorCode> first = executor.submit(task);
            Future<ErrorCode> second = executor.submit(task);
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            return Arrays.asList(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
        } finally { go.countDown(); executor.shutdownNow(); }
    }

    private ErrorCode asAdmin(Supplier<?> operation) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin", null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        try { operation.get(); return null; }
        catch (AppException ex) { return ex.getErrorCode(); }
        finally { SecurityContextHolder.clearContext(); }
    }

    private void await(CountDownLatch latch) {
        try { if (!latch.await(15, TimeUnit.SECONDS)) throw new IllegalStateException("Latch timeout"); }
        catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new IllegalStateException(ex); }
    }

    private ShowtimeRequest request(Instant at) {
        return new ShowtimeRequest(movie.getId(), room.getId(), at, at.plusSeconds(3600), 15,
                new BigDecimal("75000"), new BigDecimal("20000"));
    }

    private Booking booking(Long showtimeId, BookingStatus status) {
        return bookings.saveAndFlush(Booking.builder().bookingCode(UUID.randomUUID().toString().replace("-", ""))
                .user(users.findByEmail("customer1@cinema.com").orElseThrow())
                .showtime(showtimes.findById(showtimeId).orElseThrow()).status(status).expiresAt(time.now().plusSeconds(300)).build());
    }

    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(AppException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
