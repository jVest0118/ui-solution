package com.uisolution.platform.schema.controller;

import com.uisolution.platform.common.dto.ApiResponse;
import com.uisolution.platform.schema.dto.ScreenSchemaDto;
import com.uisolution.platform.schema.service.SchemaService;
import com.uisolution.platform.schema.service.ScreenAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/schema")
@RequiredArgsConstructor
public class SchemaController {

    private final SchemaService schemaService;
    private final ScreenAdminService screenAdminService;

    /** 화면 ID로 스키마(필드+검증룰+권한) 조회 - React 렌더러가 호출 */
    @GetMapping("/{screenId}")
    public ApiResponse<ScreenSchemaDto> getSchema(@PathVariable String screenId) {
        return ApiResponse.ok(schemaService.getSchema(screenId));
    }

    /** 전체 화면 목록 (런타임용, 하위 호환) */
    @GetMapping
    public ApiResponse<List<ScreenSchemaDto>> getAllScreens() {
        return ApiResponse.ok(schemaService.getAllScreens());
    }

    // ─── Admin 화면 관리 API ──────────────────────────────────

    @GetMapping("/admin/screens")
    public ApiResponse<List<Map<String, Object>>> getAdminScreens(
            @RequestParam(required = false) String projectId) {
        return ApiResponse.ok(screenAdminService.getAllScreens(projectId));
    }

    @PostMapping("/admin/screens")
    public ApiResponse<Map<String, Object>> saveScreen(@RequestBody Map<String, Object> req) {
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.ok(screenAdminService.saveScreen(req, currentUser));
    }

    @GetMapping("/admin/screens/{screenId}")
    public ApiResponse<Map<String, Object>> getScreenDetail(@PathVariable String screenId) {
        return ApiResponse.ok(screenAdminService.getScreenDetail(screenId));
    }

    @DeleteMapping("/admin/screens/{screenId}")
    @PreAuthorize("hasAuthority('SYSTEM_ADMIN')")
    public ApiResponse<Void> deleteScreen(@PathVariable String screenId) {
        screenAdminService.deleteScreen(screenId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/admin/screens/{screenId}/fields")
    public ApiResponse<Map<String, Object>> saveField(
            @PathVariable String screenId,
            @RequestBody Map<String, Object> req) {
        return ApiResponse.ok(screenAdminService.saveField(screenId, req));
    }

    @DeleteMapping("/admin/screens/{screenId}/fields/{fieldId}")
    public ApiResponse<Void> deleteField(@PathVariable String screenId, @PathVariable Long fieldId) {
        screenAdminService.deleteField(screenId, fieldId);
        return ApiResponse.ok(null);
    }

    @PutMapping("/admin/screens/{screenId}/fields/order")
    public ApiResponse<Void> reorderFields(
            @PathVariable String screenId,
            @RequestBody List<Long> fieldIds) {
        screenAdminService.reorderFields(screenId, fieldIds);
        return ApiResponse.ok(null);
    }

    /** 필드 2D 위치 이동 (그리드 드래그앤드랍) */
    @PutMapping("/admin/screens/{screenId}/fields/{fieldId}/move")
    public ApiResponse<Void> moveField(
            @PathVariable String screenId,
            @PathVariable Long fieldId,
            @RequestBody Map<String, Integer> pos) {
        screenAdminService.moveField(screenId, fieldId,
                pos.getOrDefault("rowPos", 0),
                pos.getOrDefault("colPos", 0));
        return ApiResponse.ok(null);
    }

    @GetMapping("/admin/fields/suggestions/name")
    public ApiResponse<List<String>> fieldNameSuggestions(
            @RequestParam(required = false) String q) {
        return ApiResponse.ok(screenAdminService.getFieldNameSuggestions(q));
    }

    @GetMapping("/admin/fields/suggestions/label")
    public ApiResponse<List<String>> fieldLabelSuggestions(
            @RequestParam(required = false) String q) {
        return ApiResponse.ok(screenAdminService.getFieldLabelSuggestions(q));
    }

    // ─── 협업 편집 상태 관리 ──────────────────────────────────

    /** 화면 잠금 (EDITING) — 설계 페이지 진입 시 호출 */
    @PostMapping("/admin/screens/{screenId}/lock")
    public ApiResponse<Map<String, Object>> lockScreen(@PathVariable String screenId) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.ok(screenAdminService.lockScreen(screenId, userId));
    }

    /** 화면 잠금 해제 (DONE) — 설계 페이지 이탈 시 호출 */
    @PostMapping("/admin/screens/{screenId}/unlock")
    public ApiResponse<Map<String, Object>> unlockScreen(@PathVariable String screenId) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.ok(screenAdminService.unlockScreen(screenId, userId));
    }

    /** 단일 화면 COMMITTED 표시 */
    @PostMapping("/admin/screens/{screenId}/commit-status")
    public ApiResponse<Map<String, Object>> markCommitted(@PathVariable String screenId) {
        return ApiResponse.ok(screenAdminService.markCommitted(screenId));
    }

    /** Git push 성공 후 모든 DONE/EDITING 화면을 COMMITTED로 일괄 전환 */
    @PostMapping("/admin/screens/bulk-commit")
    public ApiResponse<Map<String, Object>> bulkCommit() {
        int count = screenAdminService.bulkMarkCommitted();
        return ApiResponse.ok(Map.of("count", count, "message", count + "개 화면이 COMMITTED 처리되었습니다."));
    }
}
