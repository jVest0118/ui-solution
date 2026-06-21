package com.uisolution.platform.contacts.controller;

import com.uisolution.platform.common.dto.ApiResponse;
import com.uisolution.platform.contacts.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService service;

    private String me() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String group) {
        return ApiResponse.ok(service.list(me(), q, group));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> get(@PathVariable Long id) {
        return ApiResponse.ok(service.get(id, me()));
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> save(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(service.save(req, me()));
    }

    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(
            @PathVariable Long id, @RequestBody Map<String, Object> req) {
        req.put("id", id);
        return ApiResponse.ok(service.save(req, me()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id, me());
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/batch")
    public ApiResponse<Void> deleteBatch(@RequestBody List<Long> ids) {
        service.deleteBatch(ids, me());
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/favorite")
    public ApiResponse<Map<String, Object>> toggleFavorite(@PathVariable Long id) {
        return ApiResponse.ok(service.toggleFavorite(id, me()));
    }

    /* ── 그룹 ─────────────────────────────────────────── */

    @GetMapping("/groups")
    public ApiResponse<List<String>> listGroups() {
        return ApiResponse.ok(service.listGroups(me()));
    }

    @PostMapping("/groups")
    public ApiResponse<String> addGroup(@RequestBody Map<String, String> req) {
        return ApiResponse.ok(service.addGroup(me(), req.get("groupName")));
    }

    @DeleteMapping("/groups/{groupName}")
    public ApiResponse<Void> deleteGroup(@PathVariable String groupName) {
        service.deleteGroup(me(), groupName);
        return ApiResponse.ok(null);
    }
}
