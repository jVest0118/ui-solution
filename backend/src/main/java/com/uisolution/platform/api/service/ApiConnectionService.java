package com.uisolution.platform.api.service;

import com.uisolution.platform.api.entity.ApiConnection;
import com.uisolution.platform.api.repository.ApiConnectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ApiConnectionService {

    private final ApiConnectionRepository repo;

    /* ── CRUD ──────────────────────────────────────── */

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAll(String projectId) {
        List<ApiConnection> list = (projectId != null && !projectId.isBlank())
            ? repo.findByProjectIdOrderByIdAsc(projectId)
            : repo.findAll();
        return list.stream().map(this::toMap).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getOne(Long id) {
        return repo.findById(id).map(this::toMap)
            .orElseThrow(() -> new IllegalArgumentException("연결 설정을 찾을 수 없습니다: " + id));
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> req, String projectId) {
        ApiConnection conn = ApiConnection.builder()
            .connNm(str(req, "connNm"))
            .baseUrl(str(req, "baseUrl"))
            .healthUrl(str(req, "healthUrl"))
            .method(str(req, "method") != null ? str(req, "method") : "GET")
            .reqHeaders(str(req, "reqHeaders"))
            .timeoutMs(req.get("timeoutMs") != null ? ((Number) req.get("timeoutMs")).intValue() : 5000)
            .description(str(req, "description"))
            .projectId(projectId)
            .useYn("Y")
            .build();
        return toMap(repo.save(conn));
    }

    @Transactional
    public Map<String, Object> update(Long id, Map<String, Object> req) {
        ApiConnection conn = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("연결 설정을 찾을 수 없습니다: " + id));
        conn.update(
            str(req, "connNm"), str(req, "baseUrl"), str(req, "healthUrl"),
            str(req, "method") != null ? str(req, "method") : "GET",
            str(req, "reqHeaders"),
            req.get("timeoutMs") != null ? ((Number) req.get("timeoutMs")).intValue() : 5000,
            str(req, "description"),
            str(req, "useYn") != null ? str(req, "useYn") : "Y"
        );
        return toMap(conn);
    }

    @Transactional
    public void delete(Long id) {
        repo.deleteById(id);
    }

    /* ── 상태 확인 ──────────────────────────────────── */

    public List<Map<String, Object>> checkAll(String projectId) {
        List<ApiConnection> list = (projectId != null && !projectId.isBlank())
            ? repo.findByProjectIdAndUseYnOrderByIdAsc(projectId, "Y")
            : repo.findAll().stream().filter(c -> "Y".equals(c.getUseYn())).toList();
        return list.stream().map(this::checkOne).toList();
    }

    public Map<String, Object> checkOne(Long id) {
        ApiConnection conn = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("연결 설정을 찾을 수 없습니다: " + id));
        return checkOne(conn);
    }

    private Map<String, Object> checkOne(ApiConnection conn) {
        String url = (conn.getHealthUrl() != null && !conn.getHealthUrl().isBlank())
            ? conn.getHealthUrl() : conn.getBaseUrl();

        long start = System.currentTimeMillis();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", conn.getId());
        result.put("connNm", conn.getConnNm());
        result.put("baseUrl", conn.getBaseUrl());
        result.put("healthUrl", url);
        result.put("checkedAt", LocalDateTime.now().toString());

        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(conn.getTimeoutMs()))
                .build();

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMillis(conn.getTimeoutMs()));

            if ("POST".equalsIgnoreCase(conn.getMethod())) {
                reqBuilder.POST(HttpRequest.BodyPublishers.noBody());
            } else {
                reqBuilder.GET();
            }

            HttpResponse<Void> resp = client.send(reqBuilder.build(), HttpResponse.BodyHandlers.discarding());
            long elapsed = System.currentTimeMillis() - start;

            int code = resp.statusCode();
            boolean up = code >= 200 && code < 400;
            result.put("status", up ? "UP" : "DOWN");
            result.put("statusCode", code);
            result.put("responseTimeMs", elapsed);
            result.put("errorMessage", up ? null : "HTTP " + code);

        } catch (java.net.http.HttpTimeoutException e) {
            result.put("status", "TIMEOUT");
            result.put("statusCode", null);
            result.put("responseTimeMs", conn.getTimeoutMs());
            result.put("errorMessage", "타임아웃 (" + conn.getTimeoutMs() + "ms 초과)");
        } catch (IOException | InterruptedException e) {
            result.put("status", "DOWN");
            result.put("statusCode", null);
            result.put("responseTimeMs", System.currentTimeMillis() - start);
            result.put("errorMessage", e.getMessage());
        }
        return result;
    }

    /* ── 유틸 ── */

    private Map<String, Object> toMap(ApiConnection c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("connNm", c.getConnNm());
        m.put("baseUrl", c.getBaseUrl());
        m.put("healthUrl", c.getHealthUrl());
        m.put("method", c.getMethod());
        m.put("reqHeaders", c.getReqHeaders());
        m.put("timeoutMs", c.getTimeoutMs());
        m.put("description", c.getDescription());
        m.put("projectId", c.getProjectId());
        m.put("useYn", c.getUseYn());
        m.put("createdAt", c.getCreatedAt());
        return m;
    }

    private String str(Map<String, Object> m, String k) {
        Object v = m.get(k);
        return v instanceof String s ? (s.isBlank() ? null : s.trim()) : null;
    }
}
