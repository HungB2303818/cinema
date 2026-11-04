package com.example.cinema.catalog.storage;

import com.cloudinary.Cloudinary;
import com.example.cinema.common.config.CloudinaryProperties;
import com.example.cinema.common.error.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.net.URI;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class CloudinaryPosterStorage implements PosterStorage {
    private final Cloudinary cloudinary;
    private final CloudinaryProperties properties;

    @Override
    public String upload(byte[] content, String format) {
        if (!properties.isConfigured()) throw new AppException(ErrorCode.MEDIA_STORAGE_UNAVAILABLE);
        try {
            Map<?, ?> result = cloudinary.uploader().upload(content, Map.of(
                    "resource_type", "image", "public_id", properties.getPosterFolder() + "/" + UUID.randomUUID(),
                    "overwrite", false, "allowed_formats", List.of("jpg", "png"),
                    "format", format, "filename", "poster." + format));
            Object value = result.get("secure_url");
            if (!(value instanceof String url) || url.length() > 500 || !isSecureUrl(url)) {
                throw new IllegalStateException("Invalid media response");
            }
            return url;
        } catch (IOException | RuntimeException ex) {
            // Provider messages may contain signed request details or credentials. Never log them or their causes.
            log.warn("movie.poster.upload outcome=FAILED errorType={}", ex.getClass().getSimpleName());
            throw new AppException(ErrorCode.POSTER_UPLOAD_FAILED);
        }
    }

    private boolean isSecureUrl(String url) {
        URI uri = URI.create(url);
        return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                && uri.getUserInfo() == null && uri.getFragment() == null;
    }
}
