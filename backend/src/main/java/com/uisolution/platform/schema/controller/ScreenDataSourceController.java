package com.uisolution.platform.schema.controller;

import com.uisolution.platform.common.dto.ApiResponse;
import com.uisolution.platform.schema.service.ScreenDataSourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ScreenDataSourceController {

    private final ScreenDataSourceService service;

    // ─── 관리자: CRUD (/schema/admin/** → SYSTEM_ADMIN, SCREEN_ADMIN, DEVELOPER) ──

    @GetMapping("/schema/admin/screens/{screenId}/data-sources")
    public ApiResponse<List<Map<String, Object>>> list(@PathVariable String screenId) {
        return ApiResponse.ok(service.list(screenId));
    }

    @PostMapping("/schema/admin/screens/{screenId}/data-sources")
    public ApiResponse<Map<String, Object>> create(
            @PathVariable String screenId,
            @RequestBody Map<String, Object> req) {
        return ApiResponse.ok(service.save(screenId, req));
    }

    @PutMapping("/schema/admin/screens/{screenId}/data-sources/{id}")
    public ApiResponse<Map<String, Object>> update(
            @PathVariable String screenId,
            @PathVariable Long id,
            @RequestBody Map<String, Object> req) {
        return ApiResponse.ok(service.update(screenId, id, req));
    }

    @DeleteMapping("/schema/admin/screens/{screenId}/data-sources/{id}")
    public ApiResponse<Void> delete(
            @PathVariable String screenId,
            @PathVariable Long id) {
        service.delete(screenId, id);
        return ApiResponse.ok(null);
    }

    /** 관리자 테스트: testParams 직접 전달 (세션 강제 주입 없음) */
    @PostMapping("/schema/admin/screens/{screenId}/data-sources/{id}/test")
    public ApiResponse<Map<String, Object>> test(
            @PathVariable String screenId,
            @PathVariable Long id,
            @RequestBody Map<String, Object> req) {
        return ApiResponse.ok(service.test(id, req));
    }

    // ─── 런타임: 실행 (/schema/** → authenticated) ──────────────────

    /** 화면 로드 시 데이터 바인딩 실행 (인증 사용자 컨텍스트 자동 주입) */
    @PostMapping("/schema/screens/{screenId}/data-sources/{id}/execute")
    public ApiResponse<Map<String, Object>> execute(
            @PathVariable String screenId,
            @PathVariable Long id,
            @RequestBody Map<String, Object> req) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.ok(service.execute(id, req, userId));
    }
}
