package com.uisolution.platform.git.controller;

import com.uisolution.platform.common.dto.ApiResponse;
import com.uisolution.platform.git.service.GitService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/git")
@RequiredArgsConstructor
public class GitController {

    private final GitService gitService;

    /** Git 설정 조회 */
    @GetMapping("/config")
    public ApiResponse<Map<String, Object>> getConfig() {
        return ApiResponse.ok(gitService.getConfig());
    }

    /** Git 설정 저장 */
    @PostMapping("/config")
    public ApiResponse<Map<String, Object>> saveConfig(@RequestBody Map<String, Object> req) throws Exception {
        return ApiResponse.ok(gitService.saveConfig(req));
    }

    /** 연결 테스트 */
    @GetMapping("/config/test")
    public ApiResponse<Map<String, Object>> testConnection() {
        return ApiResponse.ok(gitService.testConnection());
    }

    /** 변경 파일 목록 (git status) */
    @GetMapping("/status")
    public ApiResponse<Map<String, Object>> getStatus() throws Exception {
        return ApiResponse.ok(gitService.getStatus());
    }

    /** 커밋 */
    @PostMapping("/commit")
    public ApiResponse<Map<String, Object>> commit(@RequestBody Map<String, Object> req) throws Exception {
        @SuppressWarnings("unchecked")
        List<String> paths = (List<String>) req.get("paths");
        String message    = (String) req.get("message");
        String authorName = (String) req.get("authorName");
        return ApiResponse.ok(gitService.commit(paths, message, authorName));
    }

    /** 푸시 */
    @PostMapping("/push")
    public ApiResponse<Map<String, Object>> push() throws Exception {
        return ApiResponse.ok(gitService.push());
    }

    /** 풀 (충돌 발생 시 conflicting 목록 반환) */
    @PostMapping("/pull")
    public ApiResponse<Map<String, Object>> pull() throws Exception {
        return ApiResponse.ok(gitService.pull());
    }

    /** 충돌 파일 내용 조회 */
    @GetMapping("/conflict")
    public ApiResponse<Map<String, Object>> getConflict(@RequestParam String filePath) throws Exception {
        return ApiResponse.ok(gitService.getConflictFile(filePath));
    }

    /** 충돌 해결 저장 */
    @PostMapping("/conflict/resolve")
    public ApiResponse<Map<String, Object>> resolveConflict(@RequestBody Map<String, Object> req) throws Exception {
        String filePath        = (String) req.get("filePath");
        String resolvedContent = (String) req.get("resolvedContent");
        return ApiResponse.ok(gitService.resolveConflict(filePath, resolvedContent));
    }

    /** 커밋 히스토리 */
    @GetMapping("/log")
    public ApiResponse<List<Map<String, Object>>> getLog(
            @RequestParam(defaultValue = "30") int count) throws Exception {
        return ApiResponse.ok(gitService.getLog(count));
    }
}
