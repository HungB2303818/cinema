package com.example.cinema.ticket.dto;

import java.time.Instant;

public record CheckinResponse(String result, String movieTitle, String roomName, String seatLabel, Instant checkedInAt) { }
