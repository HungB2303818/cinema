package com.example.cinema.common.util;

import com.example.cinema.auth.security.UserPrincipal;
import com.example.cinema.common.error.*;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentActor {
    private CurrentActor() { }

    public static UserPrincipal require() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || !(auth.getPrincipal() instanceof UserPrincipal principal) || !principal.isEnabled()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return principal;
    }
}
