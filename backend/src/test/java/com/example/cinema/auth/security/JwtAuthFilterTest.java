package com.example.cinema.auth.security;

import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.entity.UserRole;
import com.example.cinema.auth.entity.UserStatus;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JwtAuthFilterTest {
    private final JwtUtils jwtUtils = mock(JwtUtils.class);
    private final UserDetailsService userDetailsService = mock(UserDetailsService.class);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwtUtils, userDetailsService);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void requestWithToken(long tokenUserId, UserStatus status) throws Exception {
        User user = User.builder().id(7L).fullName("Name").email("reused@example.com")
                .passwordHash("hashed").role(UserRole.CUSTOMER).status(status).build();
        when(jwtUtils.validateToken("token")).thenReturn(true);
        when(jwtUtils.getEmailFromToken("token")).thenReturn(user.getEmail());
        when(jwtUtils.getUserIdFromToken("token")).thenReturn(tokenUserId);
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(UserPrincipal.create(user));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        filter.doFilter(request, new MockHttpServletResponse(), mock(FilterChain.class));
    }

    @Test
    void authenticatesMatchingActiveAccount() throws Exception {
        requestWithToken(7L, UserStatus.ACTIVE);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void oldTokenCannotAuthenticateNewOwnerOfReusedEmail() throws Exception {
        requestWithToken(6L, UserStatus.ACTIVE);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void inactiveAccountCannotAuthenticate() throws Exception {
        requestWithToken(7L, UserStatus.INACTIVE);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
