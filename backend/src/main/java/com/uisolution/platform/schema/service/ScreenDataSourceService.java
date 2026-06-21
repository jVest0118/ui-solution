package com.uisolution.platform.schema.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uisolution.platform.datasource.DataSourceRegistry;
import com.uisolution.platform.schema.entity.ScreenDataSource;
import com.uisolution.platform.schema.repository.ScreenDataSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScreenDataSourceService {

    private final ScreenDataSourceRepository repository;
    private final DataSourceRegistry         registry;
    private final ObjectMapper               objectMapper;

    @Autowired
    private DataSource systemDataSource;

    private static final Pattern NAMED_PARAM = Pattern.compile(":([a-zA-Z][a-zA-Z0-9_]*)");
    private static final int     MAX_ROWS    = 1000;

    // ─── CRUD ─────────────────────────────────────────────────────

    public List<Map<String, Object>> list(String screenId) {
        return repository.findByScreenIdOrderBySortOrderAscSourceNmAsc(screenId)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> save(String screenId, Map<String, Object> req) {
        String sourceNm = str(req, "sourceNm");
        if (sourceNm == null || sourceNm.isBlank())
            throw new IllegalArgumentException("데이터 소스 이름은 필수입니다.");

        // 신규 생성
        ScreenDataSource src = ScreenDataSource.builder()
                .screenId(screenId)
                .sourceNm(sourceNm)
                .sourceType(str(req, "sourceType", "SQL"))
                .connId(str(req, "connId"))
                .sqlText(str(req, "sqlText"))
                .paramsDef(str(req, "paramsDef"))
                .description(str(req, "description"))
                .sortOrder(num(req, "sortOrder", 0))
                .build();
        repository.save(src);
        return toMap(src);
    }

    @Transactional
    public Map<String, Object> update(String screenId, Long id, Map<String, Object> req) {
        ScreenDataSource src = findOne(screenId, id);
        String sourceNm = str(req, "sourceNm", src.getSourceNm());
        if (sourceNm == null || sourceNm.isBlank())
            throw new IllegalArgumentException("데이터 소스 이름은 필수입니다.");
        if (repository.existsByScreenIdAndSourceNmAndIdNot(screenId, sourceNm, id))
            throw new IllegalArgumentException("이미 사용 중인 이름입니다: " + sourceNm);

        src.update(sourceNm,
                str(req, "sourceType", src.getSourceType()),
                str(req, "connId"),
                str(req, "sqlText"),
                str(req, "paramsDef"),
                str(req, "description"),
                num(req, "sortOrder", src.getSortOrder()));
        return toMap(src);
    }

    @Transactional
    public void delete(String screenId, Long id) {
        repository.delete(findOne(screenId, id));
    }

    // ─── 테스트 실행 (관리자 - testParams 직접 사용) ──────────────

    public Map<String, Object> test(Long id, Map<String, Object> req) {
        ScreenDataSource src = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("데이터 소스를 찾을 수 없습니다: " + id));

        @SuppressWarnings("unchecked")
        Map<String, Object> testParams = req.get("testParams") instanceof Map
                ? (Map<String, Object>) req.get("testParams") : Map.of();

        // 프론트에서 현재 편집 중인 SQL을 전달하면 저장된 SQL 대신 사용 (저장 없이 즉시 테스트)
        String sqlToRun = (req.get("sqlText") instanceof String s && !s.isBlank())
                ? s : src.getSqlText();

        DataSource ds = getDataSource(src.getConnId());
        long start = System.currentTimeMillis();
        try {
            List<Map<String, Object>> rows = executeQuery(ds, sqlToRun, testParams);
            long elapsed = System.currentTimeMillis() - start;

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("rowCount", rows.size());
            result.put("previewRows", rows.size() > 20 ? rows.subList(0, 20) : rows);
            result.put("elapsedMs", elapsed);
            return result;
        } catch (Exception e) {
            log.warn("데이터소스 테스트 실패 id={}: {}", id, e.getMessage());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("error", e.getMessage());
            return result;
        }
    }

    // ─── 런타임 실행 (인증된 사용자 - session 파라미터 강제 주입) ─

    public Map<String, Object> execute(Long id, Map<String, Object> req, String currentUserId) {
        ScreenDataSource src = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("데이터 소스를 찾을 수 없습니다: " + id));

        @SuppressWarnings("unchecked")
        Map<String, Object> inputParams = req.get("inputParams") instanceof Map
                ? (Map<String, Object>) req.get("inputParams") : Map.of();

        Map<String, Object> resolved = resolveParams(src.getParamsDef(), inputParams, currentUserId);

        DataSource ds = getDataSource(src.getConnId());
        List<Map<String, Object>> rows = executeQuery(ds, src.getSqlText(), resolved);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sourceId",  src.getId());
        result.put("sourceNm",  src.getSourceNm());
        result.put("rowCount",  rows.size());
        result.put("rows",      rows);
        return result;
    }

    // ─── SQL 실행 엔진 ─────────────────────────────────────────────

    private static class ParsedSql {
        final String sql;
        final List<String> paramNames;
        ParsedSql(String sql, List<String> paramNames) {
            this.sql = sql; this.paramNames = paramNames;
        }
    }

    private ParsedSql parseSql(String sql) {
        List<String> names = new ArrayList<>();
        Matcher m = NAMED_PARAM.matcher(sql);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            names.add(m.group(1));
            m.appendReplacement(sb, "?");
        }
        m.appendTail(sb);
        return new ParsedSql(sb.toString(), names);
    }

    private void validateSql(String sql) {
        if (sql == null || sql.isBlank())
            throw new IllegalArgumentException("SQL이 비어 있습니다.");
        String upper = sql.trim().toUpperCase();
        if (!upper.startsWith("SELECT") && !upper.startsWith("WITH") && !upper.startsWith("CALL")) {
            throw new IllegalArgumentException("SELECT / WITH / CALL 문만 허용됩니다.");
        }
        // DML/DDL 키워드 차단
        String[] forbidden = {"INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "CREATE ",
                "TRUNCATE ", "GRANT ", "REVOKE ", "EXECUTE "};
        for (String kw : forbidden) {
            if (upper.contains(kw)) {
                throw new IllegalArgumentException("허용되지 않는 SQL 구문: " + kw.trim());
            }
        }
    }

    private List<Map<String, Object>> executeQuery(DataSource ds, String sqlText,
                                                    Map<String, Object> params) {
        validateSql(sqlText);
        ParsedSql parsed = parseSql(sqlText);

        List<Map<String, Object>> rows = new ArrayList<>();
        try (Connection conn = ds.getConnection();
             PreparedStatement ps = conn.prepareStatement(parsed.sql)) {

            ps.setMaxRows(MAX_ROWS);

            for (int i = 0; i < parsed.paramNames.size(); i++) {
                Object val = params.get(parsed.paramNames.get(i));
                ps.setObject(i + 1, val);
            }

            log.debug("SQL 실행: {}, params={}", parsed.sql, params);
            try (ResultSet rs = ps.executeQuery()) {
                ResultSetMetaData meta = rs.getMetaData();
                int cols = meta.getColumnCount();
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int i = 1; i <= cols; i++) {
                        row.put(meta.getColumnLabel(i).toLowerCase(), rs.getObject(i));
                    }
                    rows.add(row);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("SQL 실행 오류: " + e.getMessage(), e);
        }
        return rows;
    }

    // ─── 파라미터 해석 ─────────────────────────────────────────────

    private Map<String, Object> resolveParams(String paramsDef, Map<String, Object> inputParams,
                                               String currentUserId) {
        // inputParams 복사본 시작
        Map<String, Object> resolved = new LinkedHashMap<>(inputParams != null ? inputParams : Map.of());

        if (paramsDef == null || paramsDef.isBlank()) return resolved;

        try {
            List<Map<String, Object>> defs = objectMapper.readValue(
                    paramsDef, new TypeReference<>() {});
            for (Map<String, Object> def : defs) {
                String name      = (String) def.get("name");
                String source    = (String) def.getOrDefault("source", "input");
                String sourceKey = (String) def.getOrDefault("sourceKey", name);
                Object defaultVal = def.get("defaultValue");

                if ("session".equals(source)) {
                    // 세션 파라미터는 JWT에서 직접 주입 (프론트엔드 값 무시)
                    resolved.put(name, "userId".equals(sourceKey) ? currentUserId : defaultVal);
                } else if ("static".equals(source)) {
                    resolved.put(name, defaultVal);
                }
                // "input" → inputParams에서 이미 resolved에 있음
            }
        } catch (Exception e) {
            log.warn("paramsDef 파싱 실패: {}", e.getMessage());
        }
        return resolved;
    }

    // ─── DataSource 조회 ───────────────────────────────────────────

    private DataSource getDataSource(String connId) {
        if (connId == null || connId.isBlank() || "SYSTEM_DB".equals(connId)) {
            return systemDataSource;
        }
        return registry.get(connId).orElseThrow(() ->
                new IllegalArgumentException(
                        "연결이 활성화되지 않았습니다: " + connId + " (서버 재시작 후 시도해 주세요)"));
    }

    // ─── 유틸 ──────────────────────────────────────────────────────

    private ScreenDataSource findOne(String screenId, Long id) {
        ScreenDataSource src = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("데이터 소스를 찾을 수 없습니다: " + id));
        if (!screenId.equals(src.getScreenId()))
            throw new IllegalArgumentException("화면 ID가 일치하지 않습니다.");
        return src;
    }

    private Map<String, Object> toMap(ScreenDataSource s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          s.getId());
        m.put("screenId",    s.getScreenId());
        m.put("sourceNm",    s.getSourceNm());
        m.put("sourceType",  s.getSourceType());
        m.put("connId",      s.getConnId());
        m.put("sqlText",     s.getSqlText());
        m.put("paramsDef",   s.getParamsDef());
        m.put("description", s.getDescription());
        m.put("sortOrder",   s.getSortOrder());
        m.put("createdAt",   s.getCreatedAt());
        m.put("updatedAt",   s.getUpdatedAt());
        return m;
    }

    private static String str(Map<String, Object> m, String key) {
        return str(m, key, null);
    }

    private static String str(Map<String, Object> m, String key, String def) {
        Object v = m.get(key);
        return v instanceof String s ? (s.isBlank() ? null : s) : def;
    }

    private static int num(Map<String, Object> m, String key, int def) {
        Object v = m.get(key);
        return v instanceof Number n ? n.intValue() : def;
    }
}
