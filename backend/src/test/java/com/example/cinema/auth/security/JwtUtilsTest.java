package com.example.cinema.auth.security;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.entity.UserRole;
import com.example.cinema.auth.entity.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilsTest {

    private JwtUtils jwtUtils;
    private final String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private final long expirationMs = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils(secret, expirationMs);
    }

    @Test
    void generateAndValidateToken_success() {
        User user = User.builder()
                .id(1L)
                .fullName("Nguyen Van A")
                .email("user@example.com")
                .passwordHash("hashed")
                .role(UserRole.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();
        UserPrincipal principal = UserPrincipal.create(user);

        String token = jwtUtils.generateToken(principal);

        assertThat(token).isNotBlank();
        assertThat(jwtUtils.validateToken(token)).isTrue();
        assertThat(jwtUtils.getEmailFromToken(token)).isEqualTo("user@example.com");
        assertThat(jwtUtils.getUserIdFromToken(token)).isEqualTo(1L);
        assertThat(jwtUtils.getRoleFromToken(token)).isEqualTo("CUSTOMER");
    }

    @Test
    void validateToken_invalidToken_returnsFalse() {
        assertThat(jwtUtils.validateToken("invalid.jwt.token")).isFalse();
    }
}
