package com.example.cinema.catalog.service;

import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.storage.PosterStorage;
import com.example.cinema.common.util.Requests;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class MoviePosterService {
    private final PosterValidator validator;
    private final PosterStorage storage;
    private final MoviePosterTransactions transactions;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public MovieResponse upload(Long movieId, MultipartFile file) {
        Requests.positiveId(movieId);
        transactions.requireExists(movieId);
        var poster = validator.validate(file);
        String url = storage.upload(poster.content(), poster.format());
        // A separate short DB transaction; there is no DB lock/transaction during the provider request.
        MovieResponse response = transactions.attach(movieId, url);
        log.info("movie.poster.upload correlationId={} actor={} movieId={} outcome=SUCCESS", MDC.get("correlationId"),
                SecurityContextHolder.getContext().getAuthentication().getName(), movieId);
        return response;
    }
}
