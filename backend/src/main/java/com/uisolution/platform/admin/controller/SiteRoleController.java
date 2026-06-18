package com.uisolution.platform.admin.controller;

import com.uisolution.platform.admin.service.SiteRoleService;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/site/roles")
@RequiredArgsConstructor
public class SiteRoleController {

    private final SiteRoleService siteRoleService;

    // ─── 역할 CRUD ──────────────────────────────────────────────
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> getRoles(@RequestParam String projectId) {
        return ApiResponse.ok(siteRoleService.getRoles(projectId));
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> saveRole(
            @RequestParam String projectId,
            @RequestBody Map<String, Object> req) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.ok(siteRoleService.saveRole(projectId, req, currentUser));
    }

    @DeleteMapping("/{roleId}")
    public ApiResponse<Void> deleteRole(
            @RequestParam String projectId,
            @PathVariable String roleId) {
        siteRoleService.deleteRole(projectId, roleId);
        return ApiResponse.ok(null);
    }

    // ─── 역할-사용자 매핑 ────────────────────────────────────────
    @GetMapping("/{roleId}/users")
    public ApiResponse<List<Map<String, Object>>> getRoleUsers(
            @RequestParam String projectId,
            @PathVariable String roleId) {
        return ApiResponse.ok(siteRoleService.getRoleUsers(projectId, roleId));
    }

    @PostMapping("/{roleId}/users/{userId}")
    public ApiResponse<Void> grantUser(
            @RequestParam String projectId,
            @PathVariable String roleId,
            @PathVariable String userId) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        siteRoleService.grantUser(projectId, roleId, userId, currentUser);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{roleId}/users/{userId}")
    public ApiResponse<Void> revokeUser(
            @RequestParam String projectId,
            @PathVariable String roleId,
            @PathVariable String userId) {
        siteRoleService.revokeUser(projectId, roleId, userId);
        return ApiResponse.ok(null);
    }

    // ─── 역할-화면 권한 ──────────────────────────────────────────
    @GetMapping("/{roleId}/screens")
    public ApiResponse<List<Map<String, Object>>> getRoleScreens(
            @RequestParam String projectId,
            @PathVariable String roleId) {
        return ApiResponse.ok(siteRoleService.getRoleScreens(projectId, roleId));
    }

    @PostMapping("/{roleId}/screens")
    public ApiResponse<Void> saveRoleScreen(
            @RequestParam String projectId,
            @PathVariable String roleId,
            @RequestBody Map<String, Object> req) {
        siteRoleService.saveRoleScreen(projectId, roleId, req);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{roleId}/screens/{screenId}")
    public ApiResponse<Void> deleteRoleScreen(
            @RequestParam String projectId,
            @PathVariable String roleId,
            @PathVariable String screenId) {
        siteRoleService.deleteRoleScreen(projectId, roleId, screenId);
        return ApiResponse.ok(null);
    }

    // ─── 프로젝트 화면 목록 (권한 설정용) ───────────────────────
    @GetMapping("/screens")
    public ApiResponse<List<Map<String, Object>>> getProjectScreens(@RequestParam String projectId) {
        return ApiResponse.ok(siteRoleService.getProjectScreens(projectId));
    }
}
