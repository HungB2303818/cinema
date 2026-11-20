package com.example.cinema.auth.controller;

import com.example.cinema.auth.dto.LoginResponse;
import com.example.cinema.auth.dto.UpdateProfileRequest;
import com.example.cinema.auth.dto.UserResponse;
import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.entity.UserRole;
import com.example.cinema.auth.entity.UserStatus;
import com.example.cinema.auth.security.DelegatedAccessDeniedHandler;
import com.example.cinema.auth.security.DelegatedAuthenticationEntryPoint;
import com.example.cinema.auth.security.JwtAuthFilter;
import com.example.cinema.auth.security.JwtUtils;
import com.example.cinema.auth.security.UserPrincipal;
import com.example.cinema.auth.service.AuthService;
import com.example.cinema.common.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, DelegatedAuthenticationEntryPoint.class,
        DelegatedAccessDeniedHandler.class})
class AuthProfileControllerTest {
    @Autowired private MockMvc mvc;
    @MockBean private AuthService authService;
    @MockBean private JwtUtils jwtUtils;
    @MockBean private UserDetailsService userDetailsService;

    private UserPrincipal principal(UserRole role) {
        return UserPrincipal.create(User.builder().id(7L).fullName("Name").email("user@example.com")
                .passwordHash("hashed").role(role).status(UserStatus.ACTIVE).build());
    }

    @Test
    void guestCannotUpdateProfile() throws Exception {
        mvc.perform(put("/api/auth/me").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Name","email":"user@example.com"}
                                """))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(authService);
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void anyRoleCanUpdateOnlyItsOwnProfile(UserRole role) throws Exception {
        UserPrincipal principal = principal(role);
        when(authService.updateProfile(eq(principal), any(UpdateProfileRequest.class))).thenAnswer(invocation -> {
            UpdateProfileRequest request = invocation.getArgument(1);
            assertThat(request.getFullName()).isEqualTo("New Name");
            assertThat(request.getEmail()).isEqualTo("user@example.com");
            return LoginResponse.builder().token("new-token").tokenType("Bearer")
                    .user(UserResponse.builder().id(7L).fullName(request.getFullName()).email(request.getEmail())
                            .role(role).status(UserStatus.ACTIVE).build()).build();
        });
        mvc.perform(put("/api/auth/me")
                        .with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"id":999,"fullName":" New Name ","email":" USER@EXAMPLE.COM ","role":"ADMIN","status":"INACTIVE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("new-token"))
                .andExpect(jsonPath("$.user.id").value(7))
                .andExpect(jsonPath("$.user.role").value(role.name()))
                .andExpect(jsonPath("$.user.status").value("ACTIVE"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"fullName\":\"   \",\"email\":\"user@example.com\"}",
            "{\"fullName\":\"Name\",\"email\":\"invalid\"}",
            "{\"fullName\":\"Name\"}"
    })
    void rejectsInvalidProfile(String body) throws Exception {
        UserPrincipal principal = principal(UserRole.CUSTOMER);
        mvc.perform(put("/api/auth/me")
                        .with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(authService);
    }
}
