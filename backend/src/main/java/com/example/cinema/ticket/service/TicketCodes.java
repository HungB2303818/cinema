package com.example.cinema.ticket.service;

import org.springframework.stereotype.Component;
import java.security.SecureRandom;
import java.util.HexFormat;

@Component
public class TicketCodes {
    private final SecureRandom random = new SecureRandom();

    public String generate() {
        byte[] bytes = new byte[24]; // 192 bits; hex is case-insensitive-collation safe and fits VARCHAR(48).
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
