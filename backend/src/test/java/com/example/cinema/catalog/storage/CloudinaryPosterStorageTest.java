package com.example.cinema.catalog.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.example.cinema.common.config.CloudinaryProperties;
import com.example.cinema.common.error.*;
import org.junit.jupiter.api.*;
import java.io.IOException;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CloudinaryPosterStorageTest {
    Cloudinary cloudinary = mock(Cloudinary.class);
    Uploader uploader = mock(Uploader.class);
    CloudinaryProperties properties = new CloudinaryProperties();
    CloudinaryPosterStorage storage = new CloudinaryPosterStorage(cloudinary, properties);

    @BeforeEach void credentials() {
        properties.setCloudName("test-cloud"); properties.setApiKey("test-key"); properties.setApiSecret("test-secret");
    }

    @Test void uploadsImageWithUniquePublicIdNoOverwriteAndReturnsOnlySecureUrl() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), anyMap())).thenReturn(Map.of("secure_url", "https://res.cloudinary.com/test/image/upload/poster.png"));
        assertThat(storage.upload(new byte[]{1}, "png")).startsWith("https://");
        verify(uploader).upload(any(), argThat(options -> "image".equals(options.get("resource_type"))
                && Boolean.FALSE.equals(options.get("overwrite"))
                && options.get("public_id").toString().startsWith("cinema/posters/")
                && "png".equals(options.get("format"))));
    }

    @Test void missingCredentialsFailWithoutCallingSdk() {
        properties.setApiSecret("");
        assertCode(() -> storage.upload(new byte[]{1}, "jpg"), ErrorCode.MEDIA_STORAGE_UNAVAILABLE);
        verifyNoInteractions(cloudinary, uploader);
    }

    @Test void providerFailureDoesNotExposeSecretMessageOrCause() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        when(uploader.upload(any(), anyMap())).thenThrow(new IOException("test-secret signed request"));
        assertThatThrownBy(() -> storage.upload(new byte[]{1}, "jpg")).isInstanceOf(AppException.class)
                .hasMessageNotContaining("test-secret").hasNoCause();
    }

    @Test void rejectsMissingInsecureOrOversizedProviderUrl() throws Exception {
        when(cloudinary.uploader()).thenReturn(uploader);
        for (Map<String, String> response : java.util.List.of(Map.<String, String>of(),
                Map.of("secure_url", "http://example.test/poster.jpg"),
                Map.of("secure_url", "https://example.test/" + "a".repeat(500)))) {
            when(uploader.upload(any(), anyMap())).thenReturn(response);
            assertCode(() -> storage.upload(new byte[]{1}, "jpg"), ErrorCode.POSTER_UPLOAD_FAILED);
        }
    }

    @Test void realSdkTransportSendsSignedMultipartToLocalStub() throws Exception {
        // Exercises actual HTTP5/Jackson dependencies without sending credentials or images to Cloudinary.
        var server = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        var requestBody = new java.util.concurrent.atomic.AtomicReference<String>();
        server.createContext("/", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), java.nio.charset.StandardCharsets.ISO_8859_1));
            byte[] response = "{\"secure_url\":\"https://res.cloudinary.com/test-cloud/image/upload/poster.png\"}"
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            try (var body = exchange.getResponseBody()) { body.write(response); }
        });
        server.start();
        try {
            var sdk = new Cloudinary(Map.of("cloud_name", "test-cloud", "api_key", "test-key", "api_secret", "test-secret",
                    "upload_prefix", "http://127.0.0.1:" + server.getAddress().getPort(), "timeout", 2));
            var real = new CloudinaryPosterStorage(sdk, properties);
            assertThat(real.upload(new byte[]{1, 2, 3}, "png")).startsWith("https://res.cloudinary.com/");
            assertThat(requestBody.get()).contains("name=\"signature\"", "name=\"api_key\"", "name=\"file\"");
        } finally { server.stop(0); }
    }

    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(AppException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
