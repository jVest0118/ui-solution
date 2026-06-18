package com.uisolution.platform.auth.controller;

import com.uisolution.platform.auth.dto.LoginRequest;
import com.uisolution.platform.auth.dto.LoginResponse;
import com.uisolution.platform.auth.service.AuthService;
import com.uisolution.platform.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<Map<String, String>> refresh(@RequestBody Map<String, String> body) {
        return ApiResponse.ok(authService.refresh(body.get("refreshToken")));
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UI Solution Platform is running");
    }
}
