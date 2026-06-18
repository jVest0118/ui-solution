package com.uisolution.platform.datasource.controller;

import com.uisolution.platform.common.dto.ApiResponse;
import com.uisolution.platform.datasource.service.DbConnectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/datasource/connections")
@RequiredArgsConstructor
public class DbConnectionController {

    private final DbConnectionService service;

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> getAll() {
        return ApiResponse.ok(service.getAll());
    }

    @GetMapping("/{connId}")
    public ApiResponse<Map<String, Object>> getOne(@PathVariable String connId) {
        return ApiResponse.ok(service.getOne(connId));
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> save(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(service.save(req));
    }

    @DeleteMapping("/{connId}")
    public ApiResponse<Void> delete(@PathVariable String connId) {
        service.delete(connId);
        return ApiResponse.ok(null);
    }

    /** 저장된 연결 정보로 테스트 */
    @PostMapping("/{connId}/test")
    public ApiResponse<Map<String, Object>> test(@PathVariable String connId) {
        return ApiResponse.ok(service.testConnection(connId));
    }

    /** 저장 전 폼 데이터로 바로 테스트 */
    @PostMapping("/test-direct")
    public ApiResponse<Map<String, Object>> testDirect(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(service.testConnectionDirect(req));
    }

    /** 현재 런타임에 등록된 DataSource 상태 (커넥션 풀 현황 포함) */
    @GetMapping("/runtime-status")
    public ApiResponse<Map<String, Object>> getRuntimeStatus() {
        return ApiResponse.ok(service.getRuntimeStatus());
    }
}
