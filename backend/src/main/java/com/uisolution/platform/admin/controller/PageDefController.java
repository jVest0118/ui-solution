package com.uisolution.platform.admin.controller;

import com.uisolution.platform.admin.entity.PageDef;
import com.uisolution.platform.admin.repository.PageDefRepository;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/page-def")
@RequiredArgsConstructor
public class PageDefController {

    private final PageDefRepository pageDefRepository;

    /* ── 목록 조회 ─────────────────────────────────────────── */
    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(
            @RequestParam(required = false) String projectId) {

        List<PageDef> pages = (projectId != null && !projectId.isBlank())
                ? pageDefRepository.findByProjectIdAndUseYnOrderByCreatedAtDesc(projectId, "Y")
                : pageDefRepository.findByUseYnOrderByCreatedAtDesc("Y");

        List<Map<String, Object>> result = pages.stream()
                .map(this::toMap)
                .collect(Collectors.toList());

        return ApiResponse.ok(result);
    }

    /* ── 단건 조회 ─────────────────────────────────────────── */
    @GetMapping("/{pageId}")
    public ApiResponse<Map<String, Object>> get(@PathVariable String pageId) {
        PageDef page = pageDefRepository.findById(pageId)
                .orElseThrow(() -> new IllegalArgumentException("페이지를 찾을 수 없습니다: " + pageId));
        return ApiResponse.ok(toMap(page));
    }

    /* ── 저장 (신규/수정) ──────────────────────────────────── */
    @PostMapping
    public ApiResponse<Map<String, Object>> save(@RequestBody Map<String, Object> req) {
        String pageId     = str(req, "pageId");
        String pageNm     = str(req, "pageNm");
        String desc       = str(req, "description");
        String layoutJson = str(req, "layoutJson");
        String projectId  = str(req, "projectId");
        String currentUser = SecurityContextHolder.getContext().getAuthentication().getName();

        if (pageNm == null || pageNm.isBlank())
            throw new IllegalArgumentException("페이지명은 필수입니다.");
        if (pageId == null || pageId.isBlank())
            throw new IllegalArgumentException("페이지 ID는 필수입니다.");

        PageDef saved = pageDefRepository.findById(pageId)
                .map(p -> {
                    p.update(pageNm, desc, layoutJson, projectId);
                    return pageDefRepository.save(p);
                })
                .orElseGet(() -> pageDefRepository.save(
                        PageDef.builder()
                                .pageId(pageId)
                                .pageNm(pageNm)
                                .description(desc)
                                .layoutJson(layoutJson)
                                .projectId(projectId != null ? projectId : "DEFAULT")
                                .createdBy(currentUser)
                                .build()
                ));

        return ApiResponse.ok(toMap(saved));
    }

    /* ── 삭제 (논리 삭제) ──────────────────────────────────── */
    @DeleteMapping("/{pageId}")
    public ApiResponse<Void> delete(@PathVariable String pageId) {
        PageDef page = pageDefRepository.findById(pageId)
                .orElseThrow(() -> new IllegalArgumentException("페이지를 찾을 수 없습니다: " + pageId));
        // 논리 삭제: useYn = 'N'
        page.update(page.getPageNm(), page.getDescription(), page.getLayoutJson(), page.getProjectId());
        // useYn 직접 변경은 별도 메서드로 처리 — 여기서는 물리 삭제
        pageDefRepository.deleteById(pageId);
        return ApiResponse.ok(null);
    }

    /* ── 내부 유틸 ─────────────────────────────────────────── */
    private Map<String, Object> toMap(PageDef p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("pageId",      p.getPageId());
        m.put("pageNm",      p.getPageNm());
        m.put("description", p.getDescription());
        m.put("layoutJson",  p.getLayoutJson());
        m.put("projectId",   p.getProjectId());
        m.put("useYn",       p.getUseYn());
        m.put("createdBy",   p.getCreatedBy());
        m.put("createdAt",   p.getCreatedAt());
        m.put("updatedAt",   p.getUpdatedAt());
        return m;
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }
}
