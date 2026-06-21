package com.uisolution.platform.biz.service;

import com.uisolution.platform.datasource.DataSourceRegistry;
import com.uisolution.platform.schema.entity.FieldDef;
import com.uisolution.platform.schema.entity.ScreenDef;
import com.uisolution.platform.schema.repository.ScreenDefRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DynamicTableService {

    private final ScreenDefRepository screenDefRepository;
    private final DataSourceRegistry dataSourceRegistry;
    private final DataSource primaryDataSource;

    // ── 목록 조회 ──────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> list(String screenId, int page, int size, Map<String, String> rawParams) {
        ScreenDef screen = loadScreen(screenId);
        JdbcTemplate jt  = getJdbc(screen);
        String table  = screen.getTableNm();
        String pkCol  = effectivePk(screen);

        List<FieldDef> fields = activeFields(screen);

        // SELECT 절: fieldNm을 컬럼 별칭으로 사용하여 프론트 키와 일치
        List<String> selectCols = new ArrayList<>();
        if (fields.isEmpty()) {
            // 필드 정의 없음 → 전체 컬럼 조회 + PK를 _dataId 별칭으로 추가
            selectCols.add("*");
            selectCols.add(pkCol + " AS " + quote("_dataId"));
        } else {
            Set<String> aliased = new LinkedHashSet<>();
            for (FieldDef f : fields) {
                String col = effectiveCol(f);
                if (aliased.add(col.toLowerCase())) {
                    selectCols.add(col + " AS " + quote(f.getFieldNm()));
                }
            }
            // PK는 항상 _dataId 별칭으로 포함
            selectCols.add(pkCol + " AS " + quote("_dataId"));
        }

        // WHERE 절
        Map<String, String> search = filteredSearch(rawParams);
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        List<Object> params = new ArrayList<>();
        for (Map.Entry<String, String> e : search.entrySet()) {
            if (e.getValue() == null || e.getValue().isBlank()) continue;
            fields.stream()
                    .filter(f -> f.getFieldNm().equals(e.getKey()))
                    .findFirst()
                    .ifPresent(f -> {
                        where.append(" AND ").append(effectiveCol(f)).append(" LIKE ?");
                        params.add("%" + e.getValue() + "%");
                    });
        }

        String selectStr = String.join(", ", selectCols);
        String countSql = "SELECT COUNT(*) FROM " + table + where;
        Long total = jt.queryForObject(countSql, Long.class, params.toArray());

        String dataSql = "SELECT " + selectStr + " FROM " + table + where
                + " ORDER BY " + pkCol + " DESC LIMIT ? OFFSET ?";
        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(size);
        dataParams.add((long)(page - 1) * size);

        // 별칭(AS "fieldNm")을 사용하므로 H2도 케이스를 보존함 — 정규화 불필요
        List<Map<String, Object>> rows = jt.queryForList(dataSql, dataParams.toArray());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rows", rows);
        result.put("total", total != null ? total : 0L);
        result.put("page", page);
        result.put("size", size);
        return result;
    }

    // ── 단건 조회 ──────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> get(String screenId, String pk) {
        ScreenDef screen = loadScreen(screenId);
        JdbcTemplate jt  = getJdbc(screen);
        String pkCol = effectivePk(screen);

        String sql = "SELECT * FROM " + screen.getTableNm() + " WHERE " + pkCol + " = ?";
        List<Map<String, Object>> rows = jt.queryForList(sql, parsePk(pk));
        if (rows.isEmpty()) throw new IllegalArgumentException("데이터를 찾을 수 없습니다: " + pk);

        Map<String, Object> row = normalizeKeys(rows.get(0));

        // 컬럼명 → 필드명 매핑
        List<FieldDef> fields = activeFields(screen);
        Map<String, Object> result = new LinkedHashMap<>();
        for (FieldDef f : fields) {
            String col = effectiveCol(f).toLowerCase();
            Object val = row.get(col);
            if (val == null) val = row.get(f.getFieldNm().toLowerCase());
            result.put(f.getFieldNm(), val);
        }
        result.put("_dataId", row.get(pkCol.toLowerCase()));
        return result;
    }

    // ── 저장 ──────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> create(String screenId, Map<String, Object> body) {
        ScreenDef screen = loadScreen(screenId);
        JdbcTemplate jt  = getJdbc(screen);
        String pkCol = effectivePk(screen);
        List<FieldDef> fields = activeFields(screen);

        List<String> cols = new ArrayList<>();
        List<Object> vals = new ArrayList<>();
        for (FieldDef f : fields) {
            String col = effectiveCol(f);
            if (col.equalsIgnoreCase(pkCol)) continue;
            Object val = body.get(f.getFieldNm());
            if (val != null) { cols.add(col); vals.add(val); }
        }

        if (cols.isEmpty()) throw new IllegalArgumentException("저장할 데이터가 없습니다.");

        String placeholders = cols.stream().map(c -> "?").collect(Collectors.joining(", "));
        String sql = "INSERT INTO " + screen.getTableNm()
                + " (" + String.join(", ", cols) + ") VALUES (" + placeholders + ")";
        jt.update(sql, vals.toArray());
        return Map.of("message", "저장되었습니다.");
    }

    // ── 수정 ──────────────────────────────────────────────────────────────────
    @Transactional
    public void update(String screenId, String pk, Map<String, Object> body) {
        ScreenDef screen = loadScreen(screenId);
        JdbcTemplate jt  = getJdbc(screen);
        String pkCol = effectivePk(screen);
        List<FieldDef> fields = activeFields(screen);

        List<String> setClauses = new ArrayList<>();
        List<Object> vals = new ArrayList<>();
        for (FieldDef f : fields) {
            String col = effectiveCol(f);
            if (col.equalsIgnoreCase(pkCol)) continue;
            if (body.containsKey(f.getFieldNm())) {
                setClauses.add(col + " = ?");
                vals.add(body.get(f.getFieldNm()));
            }
        }

        if (setClauses.isEmpty()) return;
        vals.add(parsePk(pk));
        String sql = "UPDATE " + screen.getTableNm()
                + " SET " + String.join(", ", setClauses)
                + " WHERE " + pkCol + " = ?";
        jt.update(sql, vals.toArray());
    }

    // ── 삭제 ──────────────────────────────────────────────────────────────────
    @Transactional
    public void delete(String screenId, String pk) {
        ScreenDef screen = loadScreen(screenId);
        JdbcTemplate jt  = getJdbc(screen);
        String pkCol = effectivePk(screen);
        jt.update("DELETE FROM " + screen.getTableNm() + " WHERE " + pkCol + " = ?", parsePk(pk));
    }

    // ── 테이블 목록 ────────────────────────────────────────────────────────────
    public List<String> listTables(String dbConnId) {
        JdbcTemplate jt = dbConnId != null
                ? new JdbcTemplate(dataSourceRegistry.get(dbConnId)
                        .orElseThrow(() -> new IllegalArgumentException("DB 연결을 찾을 수 없습니다: " + dbConnId)))
                : new JdbcTemplate(primaryDataSource);
        return jt.queryForList(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
                + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' "
                + "ORDER BY TABLE_NAME",
                String.class);
    }

    // ── 컬럼 목록 ──────────────────────────────────────────────────────────────
    public List<Map<String, Object>> listColumns(String tableName, String dbConnId) {
        JdbcTemplate jt = dbConnId != null
                ? new JdbcTemplate(dataSourceRegistry.get(dbConnId)
                        .orElseThrow(() -> new IllegalArgumentException("DB 연결을 찾을 수 없습니다: " + dbConnId)))
                : new JdbcTemplate(primaryDataSource);
        return jt.queryForList(
                "SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type, "
                + "IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default "
                + "FROM INFORMATION_SCHEMA.COLUMNS "
                + "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? "
                + "ORDER BY ORDINAL_POSITION",
                tableName);
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────────────────────
    private ScreenDef loadScreen(String screenId) {
        return screenDefRepository.findWithFieldsAndRules(screenId)
                .orElseThrow(() -> new IllegalArgumentException("화면을 찾을 수 없습니다: " + screenId));
    }

    private JdbcTemplate getJdbc(ScreenDef screen) {
        if (screen.getDbConnId() != null && !screen.getDbConnId().isBlank()) {
            DataSource ds = dataSourceRegistry.get(screen.getDbConnId())
                    .orElseThrow(() -> new IllegalArgumentException("DB 연결을 찾을 수 없습니다: " + screen.getDbConnId()));
            return new JdbcTemplate(ds);
        }
        return new JdbcTemplate(primaryDataSource);
    }

    private List<FieldDef> activeFields(ScreenDef screen) {
        return screen.getFields().stream()
                .filter(f -> "Y".equals(f.getUseYn()))
                .collect(Collectors.toList());
    }

    private String effectivePk(ScreenDef screen) {
        return (screen.getPkColumn() != null && !screen.getPkColumn().isBlank())
                ? screen.getPkColumn() : "id";
    }

    private String effectiveCol(FieldDef f) {
        return (f.getColumnNm() != null && !f.getColumnNm().isBlank())
                ? f.getColumnNm() : f.getFieldNm();
    }

    // H2는 컬럼 별칭을 대문자로 반환하므로 소문자로 정규화
    private Map<String, Object> normalizeKeys(Map<String, Object> row) {
        Map<String, Object> norm = new LinkedHashMap<>();
        row.forEach((k, v) -> norm.put(k.toLowerCase(), v));
        return norm;
    }

    private String quote(String name) {
        return "`" + name + "`";
    }

    private Object parsePk(String pk) {
        try { return Long.parseLong(pk); } catch (NumberFormatException e) { return pk; }
    }

    private Map<String, String> filteredSearch(Map<String, String> raw) {
        Map<String, String> m = new HashMap<>(raw);
        m.remove("page"); m.remove("size");
        return m;
    }
}
