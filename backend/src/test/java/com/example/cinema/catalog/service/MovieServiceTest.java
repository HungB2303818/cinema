package com.example.cinema.catalog.service;

import com.example.cinema.catalog.dto.MovieRequest;
import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MovieServiceTest {
    @Mock private MovieRepository repository;
    @InjectMocks private MovieService service;

    @BeforeEach
    void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, List.of()));
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsDtoForVisibleMovie() {
        when(repository.findById(1L)).thenReturn(Optional.of(movie(MovieStatus.SHOWING)));
        assertThat(service.getPublic(1L).title()).isEqualTo("Phim A");
    }

    @Test
    void hidesHiddenMovieAndMissingMovieWithSameError() {
        when(repository.findById(1L)).thenReturn(Optional.of(movie(MovieStatus.HIDDEN)));
        when(repository.findById(2L)).thenReturn(Optional.empty());
        for (long id : new long[]{1, 2}) {
            assertThatThrownBy(() -> service.getPublic(id)).isInstanceOfSatisfying(AppException.class,
                    ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void mapsPageAndUsesStableWhitelistedSort() {
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(invocation -> new PageImpl<>(List.of(movie(MovieStatus.UPCOMING)),
                        invocation.getArgument(1), 1));
        var page = service.list("Phim", MovieStatus.UPCOMING, "Hành động", 0, 20, "title,asc");
        assertThat(page.content()).hasSize(1);
        assertThat(page.totalElements()).isEqualTo(1);
        verify(repository).findAll(any(Specification.class), argThat((Pageable pageable) ->
                pageable.getSort().getOrderFor("title").isAscending()
                        && pageable.getSort().getOrderFor("id") != null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"title", "description,asc", "title,invalid", "id,asc,desc", "id,", ""})
    void rejectsInvalidSort(String sort) {
        assertThatThrownBy(() -> service.list(null, null, null, 0, 20, sort))
                .isInstanceOf(AppException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsInvalidPaginationAndIds() {
        assertThatThrownBy(() -> service.list(null, null, null, -1, 20, "id,asc")).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.list(null, null, null, 0, 101, "id,asc")).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.list(null, null, null, 0, 0, "id,asc")).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.getPublic(0L)).isInstanceOf(AppException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void createsMovieAndTrimsTitle() {
        when(repository.save(any(Movie.class))).thenAnswer(invocation -> {
            Movie movie = invocation.getArgument(0);
            movie.setId(5L);
            return movie;
        });
        var result = service.create(request(MovieStatus.UPCOMING));
        assertThat(result.id()).isEqualTo(5L);
        assertThat(result.title()).isEqualTo("Phim mới");
        assertThat(result.durationMinutes()).isEqualTo(120);
    }

    @Test
    void updatesMetadataAndHidesWithoutDeletingHistory() {
        Movie movie = movie(MovieStatus.SHOWING);
        when(repository.findById(1L)).thenReturn(Optional.of(movie));
        var result = service.update(1L, request(MovieStatus.HIDDEN));
        assertThat(result.status()).isEqualTo(MovieStatus.HIDDEN);
        assertThat(movie.getTitle()).isEqualTo("Phim mới");
        verify(repository, never()).delete(any(Movie.class));
    }

    @Test
    void cannotUpdateMissingMovie() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(1L, request(MovieStatus.SHOWING))).isInstanceOf(AppException.class);
    }

    private Movie movie(MovieStatus status) {
        return Movie.builder().id(1L).title("Phim A").durationMinutes(120).status(status).build();
    }

    private MovieRequest request(MovieStatus status) {
        return new MovieRequest(" Phim mới ", "Mô tả", 120, "Hành động", "T16", null, null, status);
    }
}
