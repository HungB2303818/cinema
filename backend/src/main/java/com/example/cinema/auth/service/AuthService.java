package com.example.cinema.auth.service;

import com.example.cinema.auth.dto.LoginRequest;
import com.example.cinema.auth.dto.LoginResponse;
import com.example.cinema.auth.dto.RegisterRequest;
import com.example.cinema.auth.dto.UserResponse;
import com.example.cinema.auth.entity.User;
import com.example.cinema.auth.entity.UserRole;
import com.example.cinema.auth.entity.UserStatus;
import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.auth.security.JwtUtils;
import com.example.cinema.auth.security.UserPrincipal;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Email này đã được sử dụng.");
        }

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.CUSTOMER) // Luôn gán CUSTOMER cho đăng ký công khai
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);
        log.info("New user registered successfully: id={}, email={}", savedUser.getId(), savedUser.getEmail());

        return UserResponse.fromEntity(savedUser);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword()));

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

            if (principal.getStatus() != UserStatus.ACTIVE) {
                throw new AppException(ErrorCode.ACCESS_DENIED, "Tài khoản của bạn đã bị khóa.");
            }

            String token = jwtUtils.generateToken(principal);

            User user = userRepository.findById(principal.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy thông tin tài khoản."));

            log.info("User logged in successfully: id={}, email={}", user.getId(), user.getEmail());

            return LoginResponse.builder()
                    .token(token)
                    .tokenType("Bearer")
                    .user(UserResponse.fromEntity(user))
                    .build();
        } catch (BadCredentialsException e) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, "Email hoặc mật khẩu không chính xác.");
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy thông tin người dùng."));
        return UserResponse.fromEntity(user);
    }
}
