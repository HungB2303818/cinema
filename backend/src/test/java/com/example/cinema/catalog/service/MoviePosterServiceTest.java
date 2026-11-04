package com.example.cinema.catalog.service;

import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.storage.PosterStorage;
import com.example.cinema.common.error.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MoviePosterServiceTest {
    PosterStorage storage = mock(PosterStorage.class);
    MoviePosterTransactions transactions = mock(MoviePosterTransactions.class);
    MoviePosterService service = new MoviePosterService(new PosterValidator(), storage, transactions);

    @BeforeEach void actor() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin", null));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void checksExistenceThenUploadsThenAttachesUrlInSeparateWorker() throws Exception {
        String url = "https://res.cloudinary.com/demo/image/upload/poster.png";
        when(storage.upload(any(), eq("png"))).thenReturn(url);
        when(transactions.attach(1L, url)).thenReturn(new MovieResponse(1L, "Phim", null, 120, null, null, null, url, MovieStatus.SHOWING));
        assertThat(service.upload(1L, image()).posterUrl()).isEqualTo(url);
        var order = inOrder(transactions, storage);
        order.verify(transactions).requireExists(1L);
        order.verify(storage).upload(any(), eq("png"));
        order.verify(transactions).attach(1L, url);
    }

    @Test void missingMovieNeverUploads() throws Exception {
        doThrow(new AppException(ErrorCode.RESOURCE_NOT_FOUND)).when(transactions).requireExists(1L);
        assertThatThrownBy(() -> service.upload(1L, image())).isInstanceOf(AppException.class);
        verifyNoInteractions(storage);
    }

    @Test void providerFailureLeavesMovieUntouched() throws Exception {
        when(storage.upload(any(), any())).thenThrow(new AppException(ErrorCode.POSTER_UPLOAD_FAILED));
        assertThatThrownBy(() -> service.upload(1L, image())).isInstanceOf(AppException.class);
        verify(transactions, never()).attach(any(), any());
    }

    @Test void rejectsInvalidIdBeforeStorageOrDatabase() {
        assertThatThrownBy(() -> service.upload(0L, null)).isInstanceOf(AppException.class);
        verifyNoInteractions(transactions, storage);
    }

    private MockMultipartFile image() throws Exception { return new MockMultipartFile("file", PosterValidatorTest.image("png")); }
}
