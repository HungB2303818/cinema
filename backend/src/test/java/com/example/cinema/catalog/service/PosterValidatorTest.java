package com.example.cinema.catalog.service;

import com.example.cinema.common.error.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import static org.assertj.core.api.Assertions.*;

class PosterValidatorTest {
    final PosterValidator validator = new PosterValidator();

    @Test void acceptsPngAndJpegBasedOnPixelsNotClientFilenameOrMime() throws Exception {
        for (String format : new String[]{"png", "jpg"}) {
            byte[] bytes = image(format);
            var poster = validator.validate(new MockMultipartFile("file", "untrusted.exe", "text/plain", bytes));
            assertThat(poster.format()).isEqualTo(format);
            assertThat(ImageIO.read(new ByteArrayInputStream(poster.content())).getWidth()).isEqualTo(2);
        }
    }

    @Test void rejectsEmptyFile() {
        assertCode(new MockMultipartFile("file", new byte[0]), ErrorCode.VALIDATION_ERROR);
    }

    @Test void rejectsOversizedFileBeforeDecoding() {
        assertCode(new MockMultipartFile("file", new byte[PosterValidator.MAX_BYTES + 1]), ErrorCode.FILE_TOO_LARGE);
    }

    @Test void doesNotTrustAFileSizeThatUnderReportsActualContent() throws Exception {
        var file = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        org.mockito.Mockito.when(file.getSize()).thenReturn(1L);
        org.mockito.Mockito.when(file.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[PosterValidator.MAX_BYTES + 1]));
        assertThatThrownBy(() -> validator.validate(file)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.FILE_TOO_LARGE));
    }

    @Test void rejectsFakeImageAndSvg() {
        assertCode(new MockMultipartFile("file", "fake.png", "image/png", "not an image".getBytes()), ErrorCode.UNSUPPORTED_IMAGE_TYPE);
        assertCode(new MockMultipartFile("file", "poster.svg", "image/svg+xml", "<svg/>".getBytes()), ErrorCode.UNSUPPORTED_IMAGE_TYPE);
    }

    @Test void rejectsUnsupportedGif() throws Exception {
        assertCode(new MockMultipartFile("file", image("gif")), ErrorCode.UNSUPPORTED_IMAGE_TYPE);
    }

    @Test void rejectsTruncatedPng() throws Exception {
        assertCode(new MockMultipartFile("file", java.util.Arrays.copyOf(image("png"), 24)), ErrorCode.VALIDATION_ERROR);
    }

    @Test void rejectsHugeDimensionsBeforeDecodingPixels() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(6001, 1, BufferedImage.TYPE_INT_RGB), "png", bytes);
        assertCode(new MockMultipartFile("file", bytes.toByteArray()), ErrorCode.VALIDATION_ERROR);
    }

    @Test void stripsTrailingPayloadWhenReencoding() throws Exception {
        byte[] png = image("png");
        var content = new ByteArrayOutputStream();
        content.write(png);
        content.write("UNRELATED-PAYLOAD".getBytes());
        var result = validator.validate(new MockMultipartFile("file", content.toByteArray()));
        assertThat(new String(result.content(), java.nio.charset.StandardCharsets.ISO_8859_1)).doesNotContain("UNRELATED-PAYLOAD");
    }

    @Test void rejectsUnreadableFileWithoutExposingCause() throws Exception {
        var file = org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        org.mockito.Mockito.when(file.getInputStream()).thenThrow(new IOException("private filesystem information"));
        assertThatThrownBy(() -> validator.validate(file)).isInstanceOf(AppException.class).hasMessageNotContaining("private");
    }

    public static byte[] image(String format) throws IOException {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB), format, output);
        return output.toByteArray();
    }

    private void assertCode(MockMultipartFile file, ErrorCode code) {
        assertThatThrownBy(() -> validator.validate(file)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
