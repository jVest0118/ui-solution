package com.uisolution.platform.site.controller;

import com.uisolution.platform.common.dto.ApiResponse;
import com.uisolution.platform.site.service.SiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/site")
@RequiredArgsConstructor
public class SiteController {

    private final SiteService siteService;

    /** 사이트 메뉴 목록 (인증된 사용자 누구나) */
    @GetMapping("/menus")
    public ApiResponse<List<Map<String, Object>>> getMenus(@RequestParam String projectId) {
        return ApiResponse.ok(siteService.getMenus(projectId));
    }

    /** 사이트 설정 조회 */
    @GetMapping("/config")
    public ApiResponse<Map<String, Object>> getConfig(@RequestParam String projectId) {
        return ApiResponse.ok(siteService.getConfig(projectId));
    }

    /** 메뉴 저장 (SYSTEM_ADMIN, SCREEN_ADMIN) */
    @PostMapping("/menus")
    public ApiResponse<Map<String, Object>> saveMenu(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(siteService.saveMenu(req));
    }

    /** 메뉴 삭제 */
    @DeleteMapping("/menus/{menuId}")
    public ApiResponse<Void> deleteMenu(@PathVariable String menuId) {
        siteService.deleteMenu(menuId);
        return ApiResponse.ok(null);
    }

    /** 메뉴 순서 일괄 저장 */
    @PostMapping("/menus/order")
    public ApiResponse<Void> saveMenuOrder(@RequestBody List<Map<String, Object>> items) {
        siteService.saveMenuOrder(items);
        return ApiResponse.ok(null);
    }

    /** 사이트 설정 저장 */
    @PostMapping("/config")
    public ApiResponse<Map<String, Object>> saveConfig(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(siteService.saveConfig(req));
    }
}
