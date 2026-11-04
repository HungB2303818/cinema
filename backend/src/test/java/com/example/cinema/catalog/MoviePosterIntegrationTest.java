package com.example.cinema.catalog;

import com.example.cinema.catalog.entity.*;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.catalog.service.MoviePosterService;
import com.example.cinema.catalog.storage.PosterStorage;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.booking.cleanup.enabled=false")
@AutoConfigureMockMvc
@WithMockUser(roles = "ADMIN")
@EnabledIf("databaseAvailable")
class MoviePosterIntegrationTest {
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

    @Autowired MockMvc mvc;
    @Autowired MoviePosterService service;
    @SpyBean MovieRepository movies;
    @MockBean PosterStorage storage;
    Movie movie;

    @BeforeEach void fixture() {
        movie = movies.saveAndFlush(Movie.builder().title("Poster IT " + UUID.randomUUID()).durationMinutes(120)
                .posterUrl("https://example.test/original.jpg").status(MovieStatus.SHOWING).build());
    }

    @Test void uploadPersistsUrlAndPublicDetailReadsItWithoutChangingOtherMetadata() throws Exception {
        String url = "https://res.cloudinary.com/demo/image/upload/new.png";
        when(storage.upload(any(), eq("png"))).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return url;
        });
        mvc.perform(multipart("/api/admin/movies/{id}/poster", movie.getId()).file(image()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.posterUrl").value(url));
        mvc.perform(get("/api/movies/{id}", movie.getId())).andExpect(status().isOk()).andExpect(jsonPath("$.posterUrl").value(url));
        Movie saved = movies.findById(movie.getId()).orElseThrow();
        assertThat(saved.getTitle()).isEqualTo(movie.getTitle());
        assertThat(saved.getDurationMinutes()).isEqualTo(120);
    }

    @Test void dbFailureRollsBackPosterUpdateButCannotAtomicallyUndoRemoteUpload() throws Exception {
        when(storage.upload(any(), any())).thenReturn("https://res.cloudinary.com/demo/image/upload/new.png");
        doThrow(new DataIntegrityViolationException("Fixture DB failure")).when(movies).flush();
        assertThatThrownBy(() -> service.upload(movie.getId(), image())).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(movies.findById(movie.getId()).orElseThrow().getPosterUrl()).isEqualTo("https://example.test/original.jpg");
        verify(storage).upload(any(), any());
    }

    @Test void badFileNeverReachesRemoteStorageOrChangesPoster() throws Exception {
        mvc.perform(multipart("/api/admin/movies/{id}/poster", movie.getId())
                        .file(new MockMultipartFile("file", "fake.jpg", "image/jpeg", "invalid image".getBytes())))
                .andExpect(status().isUnsupportedMediaType());
        verifyNoInteractions(storage);
        assertThat(movies.findById(movie.getId()).orElseThrow().getPosterUrl()).isEqualTo(movie.getPosterUrl());
    }

    @Test @WithMockUser(roles = "CUSTOMER") void serviceLayerAlsoRequiresAdmin() throws Exception {
        assertThatThrownBy(() -> service.upload(movie.getId(), image())).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(storage);
    }

    @Test void concurrentUploadsAttachOneOfTheNewUrlsWithoutChangingMetadata() throws Exception {
        var counter = new java.util.concurrent.atomic.AtomicInteger();
        when(storage.upload(any(), any())).thenAnswer(call -> "https://res.cloudinary.com/demo/image/upload/" + counter.incrementAndGet() + ".png");
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        var ready = new java.util.concurrent.CountDownLatch(2);
        var go = new java.util.concurrent.CountDownLatch(1);
        try {
            java.util.concurrent.Callable<String> upload = () -> {
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("admin", null,
                                java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"))));
                try {
                    ready.countDown();
                    if (!go.await(10, java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("Latch timeout");
                    return service.upload(movie.getId(), image()).posterUrl();
                } finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            };
            var first = executor.submit(upload);
            var second = executor.submit(upload);
            assertThat(ready.await(10, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            go.countDown();
            var urls = java.util.Set.of(first.get(15, java.util.concurrent.TimeUnit.SECONDS), second.get(15, java.util.concurrent.TimeUnit.SECONDS));
            var saved = movies.findById(movie.getId()).orElseThrow();
            assertThat(saved.getPosterUrl()).isIn(urls);
            assertThat(saved.getTitle()).isEqualTo(movie.getTitle());
        } finally { go.countDown(); executor.shutdownNow(); }
    }

    private MockMultipartFile image() throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB), "png", bytes);
        return new MockMultipartFile("file", "poster.png", "image/png", bytes.toByteArray());
    }
}
