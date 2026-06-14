package com.uisolution.platform.admin.controller;

import com.uisolution.platform.admin.service.AdminService;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    // ─── Users ───────────────────────────────────────────────
    @GetMapping("/users")
    public ApiResponse<List<Map<String, Object>>> getUsers() {
        return ApiResponse.ok(adminService.getUsers());
    }

    @PostMapping("/users")
    public ApiResponse<Map<String, Object>> saveUser(@RequestBody Map<String, Object> req) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.ok(adminService.saveUser(req, currentUser));
    }

    // ─── Roles ───────────────────────────────────────────────
    @GetMapping("/roles")
    public ApiResponse<List<Map<String, Object>>> getRoles() {
        return ApiResponse.ok(adminService.getRoles());
    }

    @PostMapping("/roles")
    public ApiResponse<Map<String, Object>> saveRole(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(adminService.saveRole(req));
    }

    // ─── Menus ───────────────────────────────────────────────
    @GetMapping("/menus")
    public ApiResponse<List<Map<String, Object>>> getMenus() {
        return ApiResponse.ok(adminService.getMenus());
    }

    @PostMapping("/menus")
    public ApiResponse<Map<String, Object>> saveMenu(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(adminService.saveMenu(req));
    }

    // ─── Codes ───────────────────────────────────────────────
    @GetMapping("/codes/groups")
    public ApiResponse<List<Map<String, Object>>> getCodeGroups(
            @RequestParam(required = false) String projectId) {
        return ApiResponse.ok(adminService.getCodeGroups(projectId));
    }

    @PostMapping("/codes/groups")
    public ApiResponse<Map<String, Object>> saveCodeGroup(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(adminService.saveCodeGroup(req));
    }

    @GetMapping("/codes/groups/{groupCd}/details")
    public ApiResponse<List<Map<String, Object>>> getCodeDetails(@PathVariable String groupCd) {
        return ApiResponse.ok(adminService.getCodeDetails(groupCd));
    }

    /** 런타임 렌더러용 — 코드옵션 {label, value} 형태로 반환 */
    @GetMapping("/codes/{groupCd}/options")
    public ApiResponse<List<Map<String, Object>>> getCodeOptions(@PathVariable String groupCd) {
        return ApiResponse.ok(adminService.getCodeDetails(groupCd).stream()
                .filter(d -> "Y".equals(d.get("useYn")))
                .map(d -> {
                    java.util.Map<String, Object> opt = new java.util.LinkedHashMap<>();
                    opt.put("value", d.get("codeVal"));
                    opt.put("label", d.get("codeNm"));
                    return opt;
                })
                .collect(java.util.stream.Collectors.toList()));
    }

    @PostMapping("/codes/groups/{groupCd}/details")
    public ApiResponse<Map<String, Object>> saveCodeDetail(
            @PathVariable String groupCd,
            @RequestBody Map<String, Object> req) {
        return ApiResponse.ok(adminService.saveCodeDetail(groupCd, req));
    }
}
