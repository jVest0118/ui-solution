package com.uisolution.platform.api.controller;

import com.uisolution.platform.api.service.ApiConnectionService;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api-conn")
@RequiredArgsConstructor
public class ApiConnectionController {

    private final ApiConnectionService service;

    /* ── CRUD ──────────────────────────────────────── */

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> getAll(
            @RequestParam(required = false) String projectId) {
        return ApiResponse.ok(service.getAll(projectId));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> getOne(@PathVariable Long id) {
        return ApiResponse.ok(service.getOne(id));
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> create(
            @RequestBody Map<String, Object> req,
            @RequestParam(required = false) String projectId) {
        String proj = projectId;
        if (proj == null && req.get("projectId") instanceof String s) proj = s;
        return ApiResponse.ok(service.create(req, proj));
    }

    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> req) {
        return ApiResponse.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.ok(null);
    }

    /* ── 상태 확인 ──────────────────────────────────── */

    @GetMapping("/status")
    public ApiResponse<List<Map<String, Object>>> checkAll(
            @RequestParam(required = false) String projectId) {
        return ApiResponse.ok(service.checkAll(projectId));
    }

    @GetMapping("/{id}/status")
    public ApiResponse<Map<String, Object>> checkOne(@PathVariable Long id) {
        return ApiResponse.ok(service.checkOne(id));
    }
}
