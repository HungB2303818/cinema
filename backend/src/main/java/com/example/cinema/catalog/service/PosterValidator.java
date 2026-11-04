package com.example.cinema.catalog.service;

import com.example.cinema.common.error.*;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Iterator;
import java.util.Locale;

@Component
public class PosterValidator {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final long MAX_PIXELS = 16_000_000;
    private static final int MAX_DIMENSION = 6000;

    public ValidatedPoster validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw invalid("File poster không được rỗng.");
        if (file.getSize() > MAX_BYTES) throw new AppException(ErrorCode.FILE_TOO_LARGE);
        try (InputStream input = file.getInputStream()) {
            byte[] content = input.readNBytes(MAX_BYTES + 1);
            if (content.length > MAX_BYTES) throw new AppException(ErrorCode.FILE_TOO_LARGE);
            try (var imageInput = new MemoryCacheImageInputStream(new ByteArrayInputStream(content))) {
                Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInput);
                if (!readers.hasNext()) throw new AppException(ErrorCode.UNSUPPORTED_IMAGE_TYPE);
                ImageReader reader = readers.next();
                try {
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!format.equals("png") && !format.equals("jpeg") && !format.equals("jpg")) {
                        throw new AppException(ErrorCode.UNSUPPORTED_IMAGE_TYPE);
                    }
                    reader.setInput(imageInput, true, true);
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION
                            || (long) width * height > MAX_PIXELS) {
                        throw invalid("Poster tối đa 6000 pixel mỗi chiều và 16 triệu pixel tổng cộng.");
                    }
                    BufferedImage image = reader.read(0);
                    if (image == null) throw invalid("Không đọc được ảnh poster.");
                    // Re-encode the pixels, stripping source metadata and trailing/unrelated payloads.
                    String outputFormat = format.equals("png") ? "png" : "jpg";
                    try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                        if (!ImageIO.write(image, outputFormat, output)) throw invalid("Không xử lý được ảnh poster.");
                        byte[] normalized = output.toByteArray();
                        if (normalized.length > MAX_BYTES) throw new AppException(ErrorCode.FILE_TOO_LARGE);
                        return new ValidatedPoster(normalized, outputFormat);
                    } finally { image.flush(); }
                } finally { reader.dispose(); }
            }
        } catch (IOException ex) {
            throw invalid("File poster bị lỗi hoặc không thể đọc.");
        }
    }

    private AppException invalid(String message) { return new AppException(ErrorCode.VALIDATION_ERROR, message); }
    public record ValidatedPoster(byte[] content, String format) { }
}
