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
import java.util.Comparator;

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
                    m.put("editStatus",  s.getEditStatus() != null ? s.getEditStatus() : "COMMITTED");
                    m.put("lastEditor",  s.getLastEditor());
                    m.put("lockedBy",    s.getLockedBy());
                    m.put("createdAt",   s.getCreatedAt());
                    m.put("screenGroup", s.getScreenGroup());
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> updateScreenGroup(String screenId, String screenGroup) {
        ScreenDef screen = screenDefRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));
        screen.updateGroup(screenGroup == null || screenGroup.isBlank() ? null : screenGroup.trim());
        return Map.of("screenId", screenId, "screenGroup", screen.getScreenGroup() != null ? screen.getScreenGroup() : "");
    }

    public List<String> getAllGroups(String projectId) {
        return screenDefRepository.findAll().stream()
                .filter(s -> "Y".equals(s.getUseYn()))
                .filter(s -> projectId == null || projectId.equals(s.getProjectId()))
                .map(ScreenDef::getScreenGroup)
                .filter(g -> g != null && !g.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> lockScreen(String screenId, String userId) {
        ScreenDef screen = screenDefRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));

        String lockedBy = screen.getLockedBy();
        if (lockedBy != null && !lockedBy.equals(userId)) {
            throw new IllegalStateException(lockedBy + " 님이 작업 중입니다. 잠금을 해제할 수 없습니다.");
        }
        screen.lock(userId);
        return Map.of("editStatus", "EDITING", "lockedBy", userId);
    }

    @Transactional
    public Map<String, Object> unlockScreen(String screenId, String userId) {
        ScreenDef screen = screenDefRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));
        screen.unlock(userId);
        return Map.of("editStatus", "DONE", "lastEditor", userId);
    }

    @Transactional
    public Map<String, Object> markCommitted(String screenId) {
        ScreenDef screen = screenDefRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));
        screen.markCommitted();
        return Map.of("editStatus", "COMMITTED");
    }

    @Transactional
    public int bulkMarkCommitted() {
        List<ScreenDef> doneScreens = screenDefRepository.findAll().stream()
                .filter(s -> "DONE".equals(s.getEditStatus()) || "EDITING".equals(s.getEditStatus()))
                .collect(Collectors.toList());
        doneScreens.forEach(ScreenDef::markCommitted);
        return doneScreens.size();
    }

    @Transactional
    public Map<String, Object> saveScreen(Map<String, Object> req, String userId) {
        String screenId       = (String) req.get("screenId");
        String screenNm       = (String) req.get("screenNm");
        String screenType     = (String) req.get("screenType");
        String description    = (String) req.get("description");
        String apiResource    = (String) req.get("apiResource");
        String layoutConfig   = (String) req.get("layoutConfig");
        String buttonConfig   = (String) req.get("buttonConfig");
        String projectId      = (String) req.get("projectId");
        String openType       = (String) req.getOrDefault("openType", "page");
        String datasourceType = (String) req.getOrDefault("datasourceType", "biz_data");
        String tableNm        = (String) req.get("tableNm");
        String pkColumn       = (String) req.getOrDefault("pkColumn", "id");
        String dbConnId       = (String) req.get("dbConnId");

        ScreenDef screen = screenDefRepository.findById(screenId)
                .map(s -> {
                    s.update(screenNm, screenType, description, apiResource, layoutConfig, buttonConfig, openType,
                             datasourceType, tableNm, pkColumn, dbConnId);
                    return screenDefRepository.save(s);  // 명시적 save — dirty checking 미적용 환경 대응
                })
                .orElseGet(() -> screenDefRepository.save(ScreenDef.builder()
                        .screenId(screenId).screenNm(screenNm).screenType(screenType)
                        .description(description).apiResource(apiResource)
                        .layoutConfig(layoutConfig).buttonConfig(buttonConfig)
                        .projectId(projectId).useYn("Y").openType(openType)
                        .datasourceType(datasourceType).tableNm(tableNm).pkColumn(pkColumn).dbConnId(dbConnId)
                        .lastEditor(userId).editStatus("DONE")
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
        result.put("projectId",      screen.getProjectId());
        result.put("openType",       screen.getOpenType() != null ? screen.getOpenType() : "page");
        result.put("datasourceType", screen.getDatasourceType() != null ? screen.getDatasourceType() : "biz_data");
        result.put("tableNm",        screen.getTableNm());
        result.put("pkColumn",       screen.getPkColumn() != null ? screen.getPkColumn() : "id");
        result.put("dbConnId",       screen.getDbConnId());
        result.put("version",        screen.getVersion());
        result.put("fields", screen.getFields().stream()
                .sorted(Comparator.comparingInt(FieldDef::getRowPos).thenComparingInt(FieldDef::getColPos))
                .map(this::fieldToMap).collect(Collectors.toList()));
        return result;
    }

    @Transactional
    public Map<String, Object> saveField(String screenId, Map<String, Object> req) {
        ScreenDef screen = screenDefRepository.findWithFieldsAndRules(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));

        Object fieldIdObj = req.get("fieldId");
        Long fieldId = fieldIdObj != null ? ((Number) fieldIdObj).longValue() : null;

        if (fieldId != null) {
            final Map<String, Object> finalReq = req;
            screen.getFields().stream()
                    .filter(f -> f.getFieldId().equals(fieldId))
                    .findFirst()
                    .ifPresent(f -> updateField(f, finalReq));
        } else {
            // 신규 필드: rowPos/colPos가 없으면 마지막 행 다음 열에 자동 배치
            Map<String, Object> fieldReq = req;
            if (!req.containsKey("rowPos") || !req.containsKey("colPos")) {
                int maxRow = screen.getFields().stream().mapToInt(FieldDef::getRowPos).max().orElse(-1);
                fieldReq = new LinkedHashMap<>(req);
                fieldReq.put("rowPos", maxRow + 1);
                fieldReq.put("colPos", 0);
            }
            FieldDef field = buildField(screen, fieldReq);
            screen.getFields().add(field);
        }

        // 저장 후 최신 필드 목록을 응답에 포함 (프론트에서 즉시 반영하기 위해)
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("screenId", screenId);
        result.put("fields", screen.getFields().stream()
                .sorted(Comparator.comparingInt(FieldDef::getRowPos).thenComparingInt(FieldDef::getColPos))
                .map(this::fieldToMap).collect(Collectors.toList()));
        return result;
    }

    @Transactional
    public void deleteScreen(String screenId) {
        ScreenDef screen = screenDefRepository.findById(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));
        // 연관 데이터 FK 순서대로 삭제
        screenDefRepository.deleteBizDataByScreenId(screenId);
        screenDefRepository.deleteRoleScreenByScreenId(screenId);
        // screen 삭제 (field_def, validation_rule cascade)
        screenDefRepository.delete(screen);
    }

    @Transactional
    public void deleteField(String screenId, Long fieldId) {
        // JPA 고아 삭제(orphanRemoval) 대신 명시적 삭제 순서 제어
        // 1단계: FK 제약을 위해 validation_rule 먼저 삭제
        fieldDefRepository.deleteValidationRulesByFieldId(fieldId);
        // 2단계: 필드 삭제 (screenId 검증 포함)
        int deleted = fieldDefRepository.deleteByFieldIdAndScreenId(fieldId, screenId);
        if (deleted == 0) {
            throw new IllegalArgumentException(
                    String.format("필드를 찾을 수 없습니다 (screenId=%s, fieldId=%d)", screenId, fieldId));
        }
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

    /** 필드를 2D 그리드의 특정 위치로 이동 */
    @Transactional
    public void moveField(String screenId, Long fieldId, int rowPos, int colPos) {
        ScreenDef screen = screenDefRepository.findWithFieldsAndRules(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));
        screen.getFields().stream()
                .filter(f -> f.getFieldId().equals(fieldId))
                .findFirst()
                .ifPresent(f -> f.updatePosition(rowPos, colPos));
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
        m.put("rowSpan",    f.getRowSpan());
        m.put("sortOrder",  f.getSortOrder());
        m.put("rowPos",     f.getRowPos());
        m.put("colPos",     f.getColPos());
        m.put("readonlyYn", f.getReadonlyYn());
        m.put("hiddenYn",   f.getHiddenYn());
        m.put("useYn",      f.getUseYn() != null ? f.getUseYn() : "Y");
        m.put("codeGroup",  f.getCodeGroup());
        m.put("columnNm",   f.getColumnNm());
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

    private int getInt(Map<String, Object> req, String key, int def) {
        Object v = req.get(key);
        return v != null ? ((Number) v).intValue() : def;
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
                .colSpan(getInt(req, "colSpan", 1))
                .rowSpan(getInt(req, "rowSpan", 1))
                .sortOrder(getInt(req, "sortOrder", 0))
                .rowPos(getInt(req, "rowPos", 0))
                .colPos(getInt(req, "colPos", 0))
                .readonlyYn((String) req.getOrDefault("readonlyYn", "N"))
                .hiddenYn((String) req.getOrDefault("hiddenYn", "N"))
                .useYn((String) req.getOrDefault("useYn", "Y"))
                .codeGroup((String) req.get("codeGroup"))
                .columnNm((String) req.get("columnNm"))
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
                getInt(req, "colSpan", f.getColSpan()),
                getInt(req, "rowSpan", f.getRowSpan()),
                getInt(req, "sortOrder", f.getSortOrder()),
                (String) req.getOrDefault("readonlyYn", f.getReadonlyYn()),
                (String) req.getOrDefault("hiddenYn", f.getHiddenYn()),
                (String) req.getOrDefault("useYn", f.getUseYn() != null ? f.getUseYn() : "Y"),
                (String) req.get("codeGroup"),
                req.containsKey("extraConfig") ? toJson(req.get("extraConfig")) : f.getExtraConfig(),
                getInt(req, "rowPos", f.getRowPos()),
                getInt(req, "colPos", f.getColPos()),
                req.containsKey("columnNm") ? (String) req.get("columnNm") : f.getColumnNm()
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
