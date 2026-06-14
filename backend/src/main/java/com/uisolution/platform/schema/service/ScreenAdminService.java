package com.uisolution.platform.schema.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uisolution.platform.schema.entity.FieldDef;
import com.uisolution.platform.schema.entity.ScreenDef;
import com.uisolution.platform.schema.entity.ValidationRule;
import com.uisolution.platform.schema.repository.FieldDefRepository;
import com.uisolution.platform.schema.repository.ScreenDefRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScreenAdminService {

    private final ScreenDefRepository screenDefRepository;
    private final FieldDefRepository fieldDefRepository;
    private final ObjectMapper objectMapper;

    public List<Map<String, Object>> getAllScreens(String projectId) {
        return screenDefRepository.findAll().stream()
                .filter(s -> "Y".equals(s.getUseYn()))
                .filter(s -> projectId == null || projectId.equals(s.getProjectId()))
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("screenId",    s.getScreenId());
                    m.put("screenNm",    s.getScreenNm());
                    m.put("screenType",  s.getScreenType());
                    m.put("description", s.getDescription());
                    m.put("apiResource", s.getApiResource());
                    m.put("version",     s.getVersion());
                    m.put("projectId",   s.getProjectId());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> saveScreen(Map<String, Object> req, String userId) {
        String screenId   = (String) req.get("screenId");
        String screenNm   = (String) req.get("screenNm");
        String screenType = (String) req.get("screenType");
        String description = (String) req.get("description");
        String apiResource = (String) req.get("apiResource");
        String layoutConfig = (String) req.get("layoutConfig");
        String buttonConfig = (String) req.get("buttonConfig");
        String projectId  = (String) req.get("projectId");

        ScreenDef screen = screenDefRepository.findById(screenId)
                .map(s -> { s.update(screenNm, screenType, description, apiResource, layoutConfig, buttonConfig); return s; })
                .orElseGet(() -> screenDefRepository.save(ScreenDef.builder()
                        .screenId(screenId).screenNm(screenNm).screenType(screenType)
                        .description(description).apiResource(apiResource)
                        .layoutConfig(layoutConfig).buttonConfig(buttonConfig)
                        .projectId(projectId).useYn("Y")
                        .build()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("screenId", screen.getScreenId());
        return result;
    }

    public Map<String, Object> getScreenDetail(String screenId) {
        ScreenDef screen = screenDefRepository.findWithFieldsAndRules(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("screenId",    screen.getScreenId());
        result.put("screenNm",    screen.getScreenNm());
        result.put("screenType",  screen.getScreenType());
        result.put("description", screen.getDescription());
        result.put("apiResource", screen.getApiResource());
        result.put("layoutConfig", screen.getLayoutConfig());
        result.put("buttonConfig", screen.getButtonConfig());
        result.put("projectId",   screen.getProjectId());
        result.put("version",     screen.getVersion());
        result.put("fields", screen.getFields().stream().map(this::fieldToMap).collect(Collectors.toList()));
        return result;
    }

    @Transactional
    public Map<String, Object> saveField(String screenId, Map<String, Object> req) {
        ScreenDef screen = screenDefRepository.findWithFieldsAndRules(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));

        Object fieldIdObj = req.get("fieldId");
        Long fieldId = fieldIdObj != null ? ((Number) fieldIdObj).longValue() : null;

        if (fieldId != null) {
            // 기존 필드 수정
            screen.getFields().stream()
                    .filter(f -> f.getFieldId().equals(fieldId))
                    .findFirst()
                    .ifPresent(f -> updateField(f, req));
        } else {
            // 신규 필드 추가
            FieldDef field = buildField(screen, req);
            screen.getFields().add(field);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("screenId", screenId);
        return result;
    }

    @Transactional
    public void deleteField(String screenId, Long fieldId) {
        ScreenDef screen = screenDefRepository.findWithFieldsAndRules(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));
        screen.getFields().removeIf(f -> f.getFieldId().equals(fieldId));
    }

    @Transactional
    public void reorderFields(String screenId, List<Long> fieldIds) {
        ScreenDef screen = screenDefRepository.findWithFieldsAndRules(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));
        Map<Long, FieldDef> fieldMap = screen.getFields().stream()
                .collect(Collectors.toMap(FieldDef::getFieldId, f -> f));
        for (int i = 0; i < fieldIds.size(); i++) {
            FieldDef f = fieldMap.get(fieldIds.get(i));
            if (f != null) f.updateSortOrder(i);
        }
    }

    private Map<String, Object> fieldToMap(FieldDef f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fieldId",    f.getFieldId());
        m.put("fieldNm",    f.getFieldNm());
        m.put("fieldLabel", f.getFieldLabel());
        m.put("fieldType",  f.getFieldType());
        m.put("inputType",  f.getInputType());
        m.put("placeholder", f.getPlaceholder());
        m.put("defaultValue", f.getDefaultValue());
        m.put("colSpan",    f.getColSpan());
        m.put("sortOrder",  f.getSortOrder());
        m.put("readonlyYn", f.getReadonlyYn());
        m.put("hiddenYn",   f.getHiddenYn());
        m.put("codeGroup",  f.getCodeGroup());
        m.put("extraConfig", parseJson(f.getExtraConfig()));
        m.put("validationRules", f.getValidationRules().stream().map(r -> {
            Map<String, Object> rm = new LinkedHashMap<>();
            rm.put("ruleId",    r.getRuleId());
            rm.put("ruleType",  r.getRuleType());
            rm.put("ruleValue", r.getRuleValue());
            rm.put("errorMsg",  r.getErrorMsg());
            return rm;
        }).collect(Collectors.toList()));
        return m;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) return null;
        try { return objectMapper.readValue(json, Map.class); } catch (Exception e) { return null; }
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try { return objectMapper.writeValueAsString(obj); } catch (Exception e) { return null; }
    }

    private FieldDef buildField(ScreenDef screen, Map<String, Object> req) {
        return FieldDef.builder()
                .screenDef(screen)
                .fieldNm((String) req.get("fieldNm"))
                .fieldLabel((String) req.get("fieldLabel"))
                .fieldType((String) req.getOrDefault("fieldType", "text"))
                .inputType((String) req.get("inputType"))
                .placeholder((String) req.get("placeholder"))
                .defaultValue((String) req.get("defaultValue"))
                .colSpan(req.containsKey("colSpan") ? ((Number) req.get("colSpan")).intValue() : 1)
                .sortOrder(req.containsKey("sortOrder") ? ((Number) req.get("sortOrder")).intValue() : 0)
                .readonlyYn((String) req.getOrDefault("readonlyYn", "N"))
                .hiddenYn((String) req.getOrDefault("hiddenYn", "N"))
                .codeGroup((String) req.get("codeGroup"))
                .extraConfig(toJson(req.get("extraConfig")))
                .build();
    }

    private void updateField(FieldDef f, Map<String, Object> req) {
        f.updateAll(
                (String) req.get("fieldNm"),
                (String) req.get("fieldLabel"),
                (String) req.getOrDefault("fieldType", "text"),
                (String) req.get("placeholder"),
                (String) req.get("defaultValue"),
                req.containsKey("colSpan") ? ((Number) req.get("colSpan")).intValue() : f.getColSpan(),
                req.containsKey("sortOrder") ? ((Number) req.get("sortOrder")).intValue() : f.getSortOrder(),
                (String) req.getOrDefault("readonlyYn", f.getReadonlyYn()),
                (String) req.getOrDefault("hiddenYn", f.getHiddenYn()),
                (String) req.get("codeGroup"),
                req.containsKey("extraConfig") ? toJson(req.get("extraConfig")) : f.getExtraConfig()
        );
    }

    public List<String> getFieldNameSuggestions(String q) {
        PageRequest top10 = PageRequest.of(0, 10);
        List<Object[]> rows = (q == null || q.isBlank())
                ? fieldDefRepository.findTopFieldNamesAll(top10)
                : fieldDefRepository.findTopFieldNames(q.toLowerCase(), top10);
        return rows.stream().map(r -> (String) r[0]).collect(Collectors.toList());
    }

    public List<String> getFieldLabelSuggestions(String q) {
        PageRequest top10 = PageRequest.of(0, 10);
        List<Object[]> rows = (q == null || q.isBlank())
                ? fieldDefRepository.findTopFieldLabelsAll(top10)
                : fieldDefRepository.findTopFieldLabels(q, top10);
        return rows.stream().map(r -> (String) r[0]).collect(Collectors.toList());
    }
}
