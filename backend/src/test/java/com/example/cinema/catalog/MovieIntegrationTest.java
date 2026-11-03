package com.example.cinema.catalog;

import com.example.cinema.catalog.dto.MovieRequest;
import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.catalog.service.MovieService;
import com.example.cinema.common.error.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties = "app.booking.cleanup.enabled=false")
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class MovieIntegrationTest {
    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.0.36");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @Autowired private MovieRepository repository;
    @Autowired private MovieService service;

    @BeforeEach
    void seed() {
        repository.save(Movie.builder().title("Movie-Test A_100%").genre("Drama")
                .durationMinutes(120).status(MovieStatus.SHOWING).build());
        repository.save(Movie.builder().title("Movie-Test B").genre("Drama")
                .durationMinutes(95).status(MovieStatus.UPCOMING).build());
        repository.save(Movie.builder().title("Movie-Test Secret").genre("Drama")
                .durationMinutes(110).status(MovieStatus.HIDDEN).build());
        repository.flush();
    }

    @Test
    void filtersHiddenMoviesAndSupportsPagination() {
        var result = service.list("Movie-Test", null, "drama", 0, 1, "title,asc");
        assertThat(result.totalElements()).isEqualTo(2);
        assertThat(result.totalPages()).isEqualTo(2);
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).title()).isEqualTo("Movie-Test A_100%");
        assertThat(service.list("Movie-Test", MovieStatus.HIDDEN, null, 0, 20, "id,asc").content()).isEmpty();
        assertThat(service.list("Movie-Test", MovieStatus.UPCOMING, null, 0, 20, "id,asc").totalElements()).isEqualTo(1);
    }

    @Test
    void treatsSearchWildcardsAsLiteralText() {
        assertThat(service.list("_100%", null, null, 0, 20, "id,asc").totalElements()).isEqualTo(1);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void persistsCreateAndUpdateThenHidesMovie() {
        var created = service.create(new MovieRequest("Integration movie", null, 120,
                "Drama", "T16", null, "https://example.test/poster.jpg", MovieStatus.SHOWING));
        repository.flush();
        assertThat(service.getPublic(created.id()).posterUrl()).isEqualTo("https://example.test/poster.jpg");
        service.update(created.id(), new MovieRequest("Updated movie", null, 95,
                null, null, null, null, MovieStatus.HIDDEN));
        repository.flush();
        assertThat(repository.findById(created.id())).get().extracting(Movie::getTitle).isEqualTo("Updated movie");
        assertThatThrownBy(() -> service.getPublic(created.id())).isInstanceOf(AppException.class);
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void serviceAlsoEnforcesAdminAuthorization() {
        assertThatThrownBy(() -> service.create(new MovieRequest("Forbidden", null, 120,
                null, null, null, null, MovieStatus.SHOWING))).isInstanceOf(AccessDeniedException.class);
    }
}
