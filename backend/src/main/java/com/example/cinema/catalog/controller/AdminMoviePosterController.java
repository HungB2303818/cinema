package com.example.cinema.catalog.controller;

import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.service.MoviePosterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/movies")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Movies")
public class AdminMoviePosterController {
    private final MoviePosterService service;

    @PostMapping(value = "/{id}/poster", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload poster JPEG/PNG lên Cloudinary và gắn vào phim (tối đa 5 MB)")
    public MovieResponse upload(@PathVariable Long id, @RequestPart("file") MultipartFile file) {
        return service.upload(id, file);
    }
}
