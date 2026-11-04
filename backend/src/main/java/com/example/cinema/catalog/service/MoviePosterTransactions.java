package com.example.cinema.catalog.service;

import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.common.error.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@RequiredArgsConstructor
public class MoviePosterTransactions {
    private final MovieRepository movies;

    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public void requireExists(Long id) {
        if (!movies.existsById(id)) throw notFound();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public MovieResponse attach(Long id, String url) {
        var movie = movies.findByIdForUpdate(id).orElseThrow(this::notFound);
        movie.setPosterUrl(url);
        movies.flush();
        return MovieResponse.from(movie);
    }

    private AppException notFound() { return new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy phim."); }
}
