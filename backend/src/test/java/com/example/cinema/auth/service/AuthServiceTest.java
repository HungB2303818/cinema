package com.example.cinema.auth.service;

import com.example.cinema.auth.dto.LoginRequest;
import com.example.cinema.auth.dto.LoginResponse;
import com.example.cinema.auth.dto.RegisterRequest;
import com.example.cinema.auth.dto.UserResponse;
import com.example.cinema.auth.dto.UpdateProfileRequest;
import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.entity.UserRole;
import com.example.cinema.auth.entity.UserStatus;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.auth.security.JwtUtils;
import com.example.cinema.auth.security.UserPrincipal;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtils jwtUtils;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, authenticationManager, jwtUtils);
    }

    @Test
    void register_success_roleIsAlwaysCustomer() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Nguyen Van A")
                .email("test@example.com")
                .password("Password@123")
                .build();

        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password@123")).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(10L);
            return u;
        });

        UserResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getEmail()).isEqualTo("test@example.com");
        assertThat(response.getRole()).isEqualTo(UserRole.CUSTOMER);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_duplicateEmail_throwsAppException() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Nguyen Van A")
                .email("duplicate@example.com")
                .password("Password@123")
                .build();

        when(userRepository.existsByEmail("duplicate@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Email này đã được sử dụng")
                .satisfies(ex -> assertThat(((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_success() {
        LoginRequest request = LoginRequest.builder()
                .email("user@example.com")
                .password("Password@123")
                .build();

        User user = User.builder()
                .id(1L)
                .fullName("User Name")
                .email("user@example.com")
                .passwordHash("hashed")
                .role(UserRole.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();
        UserPrincipal principal = UserPrincipal.create(user);

        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        when(authenticationManager.authenticate(any())).thenReturn(authToken);
        when(jwtUtils.generateToken(principal)).thenReturn("jwt.token.mock");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("jwt.token.mock");
        assertThat(response.getUser().getEmail()).isEqualTo("user@example.com");
    }

    @Test
    void login_badCredentials_throwsAppException() {
        LoginRequest request = LoginRequest.builder()
                .email("user@example.com")
                .password("WrongPassword")
                .build();

        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.UNAUTHENTICATED));
    }

    private User profileUser() {
        return User.builder().id(7L).fullName("Old Name").email("old@example.com")
                .passwordHash("hashed").role(UserRole.STAFF).status(UserStatus.ACTIVE).build();
    }

    @Test
    void updateProfile_nameOnlyPreservesProtectedFieldsAndRenewsToken() {
        User user = profileUser();
        var createdAt = user.getCreatedAt();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(jwtUtils.generateToken(any())).thenReturn("updated-token");

        LoginResponse response = authService.updateProfile(UserPrincipal.create(user),
                UpdateProfileRequest.builder().fullName("  New Name  ").email("OLD@example.com").build());

        assertThat(response.getUser().getFullName()).isEqualTo("New Name");
        assertThat(response.getUser().getEmail()).isEqualTo("old@example.com");
        assertThat(response.getToken()).isEqualTo("updated-token");
        assertThat(user.getRole()).isEqualTo(UserRole.STAFF);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getPasswordHash()).isEqualTo("hashed");
        assertThat(user.getCreatedAt()).isEqualTo(createdAt);
        verify(userRepository).saveAndFlush(user);
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void updateProfile_emailChangeRequiresPasswordAndIssuesTokenForNewEmail() {
        User user = profileUser();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "hashed")).thenReturn(true);
        when(jwtUtils.generateToken(any())).thenAnswer(invocation -> {
            UserPrincipal principal = invocation.getArgument(0);
            assertThat(principal.getId()).isEqualTo(7L);
            assertThat(principal.getEmail()).isEqualTo("new@example.com");
            return "new-email-token";
        });

        LoginResponse response = authService.updateProfile(UserPrincipal.create(user),
                UpdateProfileRequest.builder().fullName("New Name").email(" NEW@EXAMPLE.COM ")
                        .currentPassword("secret").build());

        assertThat(response.getUser().getEmail()).isEqualTo("new@example.com");
        assertThat(response.getToken()).isEqualTo("new-email-token");
    }

    @Test
    void updateProfile_wrongPasswordDoesNotChangeAnyFields() {
        User user = profileUser();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        assertThatThrownBy(() -> authService.updateProfile(UserPrincipal.create(user),
                UpdateProfileRequest.builder().fullName("New Name").email("new@example.com")
                        .currentPassword("wrong").build()))
                .isInstanceOf(AppException.class).hasMessageContaining("Mật khẩu hiện tại không chính xác");
        assertThat(user.getFullName()).isEqualTo("Old Name");
        assertThat(user.getEmail()).isEqualTo("old@example.com");
        verify(userRepository, never()).saveAndFlush(any());
        verifyNoInteractions(jwtUtils);
    }

    @Test
    void updateProfile_missingPasswordCannotChangeEmail() {
        User user = profileUser();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        assertThatThrownBy(() -> authService.updateProfile(UserPrincipal.create(user),
                UpdateProfileRequest.builder().fullName("New Name").email("new@example.com").build()))
                .isInstanceOf(AppException.class).hasMessageContaining("Mật khẩu hiện tại không chính xác");
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateProfile_duplicateEmailIsRejectedBeforeSaving() {
        User user = profileUser();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "hashed")).thenReturn(true);
        when(userRepository.existsByEmail("new@example.com")).thenReturn(true);
        assertThatThrownBy(() -> authService.updateProfile(UserPrincipal.create(user),
                UpdateProfileRequest.builder().fullName("New Name").email("new@example.com")
                        .currentPassword("secret").build()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_RESOURCE));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateProfile_concurrentDuplicateEmailIsMappedToConflict() {
        User user = profileUser();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "hashed")).thenReturn(true);
        when(userRepository.saveAndFlush(user)).thenThrow(new DataIntegrityViolationException("duplicate"));
        assertThatThrownBy(() -> authService.updateProfile(UserPrincipal.create(user),
                UpdateProfileRequest.builder().fullName("New Name").email("new@example.com")
                        .currentPassword("secret").build()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_RESOURCE));
        verifyNoInteractions(jwtUtils);
    }

    @Test
    void updateProfile_missingUserIsNotFound() {
        when(userRepository.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> authService.updateProfile(UserPrincipal.create(profileUser()),
                UpdateProfileRequest.builder().fullName("Name").email("old@example.com").build()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    void updateProfile_inactiveAccountIsForbidden() {
        User user = profileUser();
        user.setStatus(UserStatus.INACTIVE);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        assertThatThrownBy(() -> authService.updateProfile(UserPrincipal.create(user),
                UpdateProfileRequest.builder().fullName("Name").email("old@example.com").build()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED));
        verify(userRepository, never()).saveAndFlush(any());
    }
}
