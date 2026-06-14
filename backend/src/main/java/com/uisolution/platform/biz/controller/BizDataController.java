package com.uisolution.platform.biz.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uisolution.platform.biz.entity.BizData;
import com.uisolution.platform.biz.repository.BizDataRepository;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/biz/{screenId}")
@RequiredArgsConstructor
public class BizDataController {

    private final BizDataRepository bizDataRepository;
    private final ObjectMapper objectMapper;

    private String currentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> list(
            @PathVariable String screenId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam Map<String, String> params) {

        PageRequest pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BizData> pageResult = bizDataRepository.findActiveByScreenId(screenId, pageable);

        Map<String, String> searchParams = new HashMap<>(params);
        searchParams.remove("page");
        searchParams.remove("size");

        List<Map<String, Object>> rows = pageResult.getContent().stream()
                .map(b -> {
                    try {
                        Map<String, Object> data = objectMapper.readValue(b.getDataJson(),
                                new TypeReference<Map<String, Object>>() {});
                        data.put("_dataId", b.getDataId());
                        data.put("_createdAt", b.getCreatedAt());
                        data.put("_createdBy", b.getCreatedBy());
                        return data;
                    } catch (Exception e) {
                        return Map.<String, Object>of("_dataId", b.getDataId(), "_error", "parse error");
                    }
                })
                .filter(row -> searchParams.entrySet().stream()
                        .allMatch(e -> {
                            Object val = row.get(e.getKey());
                            return val != null && val.toString().contains(e.getValue());
                        }))
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rows", rows);
        result.put("total", pageResult.getTotalElements());
        result.put("page", page);
        result.put("size", size);
        result.put("totalPages", pageResult.getTotalPages());
        return ApiResponse.ok(result);
    }

    @GetMapping("/{dataId}")
    public ApiResponse<Map<String, Object>> get(
            @PathVariable String screenId,
            @PathVariable Long dataId) {
        BizData biz = bizDataRepository.findActiveById(dataId, screenId)
                .orElseThrow(() -> new IllegalArgumentException("데이터를 찾을 수 없습니다."));
        try {
            Map<String, Object> data = objectMapper.readValue(biz.getDataJson(),
                    new TypeReference<Map<String, Object>>() {});
            data.put("_dataId", biz.getDataId());
            data.put("_createdAt", biz.getCreatedAt());
            return ApiResponse.ok(data);
        } catch (Exception e) {
            throw new RuntimeException("데이터 파싱 오류", e);
        }
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> create(
            @PathVariable String screenId,
            @RequestBody Map<String, Object> body) {
        try {
            body.remove("_dataId"); body.remove("_createdAt"); body.remove("_createdBy");
            String json = objectMapper.writeValueAsString(body);
            BizData saved = bizDataRepository.save(BizData.builder()
                    .screenId(screenId)
                    .dataJson(json)
                    .createdBy(currentUser())
                    .statusCd("ACTIVE")
                    .build());
            return ApiResponse.ok(Map.of("dataId", saved.getDataId()));
        } catch (Exception e) {
            throw new RuntimeException("저장 오류", e);
        }
    }

    @PutMapping("/{dataId}")
    public ApiResponse<Map<String, Object>> update(
            @PathVariable String screenId,
            @PathVariable Long dataId,
            @RequestBody Map<String, Object> body) {
        BizData biz = bizDataRepository.findActiveById(dataId, screenId)
                .orElseThrow(() -> new IllegalArgumentException("데이터를 찾을 수 없습니다."));
        try {
            body.remove("_dataId"); body.remove("_createdAt"); body.remove("_createdBy");
            biz.update(objectMapper.writeValueAsString(body), currentUser());
            bizDataRepository.save(biz);
            return ApiResponse.ok(Map.of("dataId", dataId));
        } catch (Exception e) {
            throw new RuntimeException("수정 오류", e);
        }
    }

    @DeleteMapping("/{dataId}")
    public ApiResponse<Void> delete(
            @PathVariable String screenId,
            @PathVariable Long dataId) {
        BizData biz = bizDataRepository.findActiveById(dataId, screenId)
                .orElseThrow(() -> new IllegalArgumentException("데이터를 찾을 수 없습니다."));
        biz.delete(currentUser());
        bizDataRepository.save(biz);
        return ApiResponse.ok(null);
    }
}
