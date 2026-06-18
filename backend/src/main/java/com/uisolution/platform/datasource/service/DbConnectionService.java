package com.uisolution.platform.datasource.service;

import com.uisolution.platform.datasource.DataSourceRegistry;
import com.uisolution.platform.datasource.entity.DbConnection;
import com.uisolution.platform.datasource.repository.DbConnectionRepository;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DbConnectionService {

    private final DbConnectionRepository repository;
    private final DataSourceRegistry     registry;

    @Autowired
    private DataSource systemDataSource;  // Spring Boot 기본 DataSource (SYSTEM_DB)

    // ─── 기본 CRUD ─────────────────────────────────────────────

    public List<Map<String, Object>> getAll() {
        return repository.findAllByOrderByIsDefaultDescConnNameAsc()
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    public Map<String, Object> getOne(String connId) {
        return toMap(repository.findById(connId)
                .orElseThrow(() -> new IllegalArgumentException("연결 정보를 찾을 수 없습니다: " + connId)));
    }

    @Transactional
    public Map<String, Object> save(Map<String, Object> req) {
        String connId = (String) req.get("connId");

        if (connId == null || connId.isBlank())
            throw new IllegalArgumentException("연결 ID는 필수입니다.");

        String isDefault = (String) req.getOrDefault("isDefault", "N");

        // 기본 연결로 설정 시 기존 기본 연결 해제
        if ("Y".equals(isDefault)) {
            repository.findAllByOrderByIsDefaultDescConnNameAsc().stream()
                    .filter(c -> "Y".equals(c.getIsDefault()) && !c.getConnId().equals(connId))
                    .forEach(c -> c.update(c.getConnName(), c.getDbType(), c.getHost(), c.getPort(),
                            c.getDbName(), c.getSchemaName(), c.getUsername(), null,
                            c.getJdbcUrl(), c.getXaClass(), c.getIsXa(), c.getIsActive(),
                            "N", c.getPoolMin(), c.getPoolMax(), c.getConnTimeout(),
                            c.getTestQuery(), c.getDescription(), c.getExtraProps()));
        }

        DbConnection conn = repository.findById(connId).orElse(null);
        if (conn != null) {
            // 업데이트
            conn.update(
                    (String) req.get("connName"),
                    (String) req.get("dbType"),
                    (String) req.get("host"),
                    req.get("port") != null ? ((Number) req.get("port")).intValue() : null,
                    (String) req.get("dbName"),
                    (String) req.get("schemaName"),
                    (String) req.get("username"),
                    (String) req.get("password"),
                    (String) req.get("jdbcUrl"),
                    (String) req.get("xaClass"),
                    (String) req.getOrDefault("isXa", "N"),
                    (String) req.getOrDefault("isActive", "Y"),
                    isDefault,
                    req.get("poolMin") != null ? ((Number) req.get("poolMin")).intValue() : conn.getPoolMin(),
                    req.get("poolMax") != null ? ((Number) req.get("poolMax")).intValue() : conn.getPoolMax(),
                    req.get("connTimeout") != null ? ((Number) req.get("connTimeout")).intValue() : conn.getConnTimeout(),
                    (String) req.get("testQuery"),
                    (String) req.get("description"),
                    (String) req.get("extraProps")
            );
        } else {
            // 신규 등록
            conn = DbConnection.builder()
                    .connId(connId)
                    .connName((String) req.get("connName"))
                    .dbType((String) req.get("dbType"))
                    .host((String) req.get("host"))
                    .port(req.get("port") != null ? ((Number) req.get("port")).intValue() : null)
                    .dbName((String) req.get("dbName"))
                    .schemaName((String) req.get("schemaName"))
                    .username((String) req.get("username"))
                    .password((String) req.get("password"))
                    .jdbcUrl((String) req.get("jdbcUrl"))
                    .xaClass((String) req.get("xaClass"))
                    .isXa((String) req.getOrDefault("isXa", "N"))
                    .isActive((String) req.getOrDefault("isActive", "Y"))
                    .isDefault(isDefault)
                    .poolMin(req.get("poolMin") != null ? ((Number) req.get("poolMin")).intValue() : 2)
                    .poolMax(req.get("poolMax") != null ? ((Number) req.get("poolMax")).intValue() : 10)
                    .connTimeout(req.get("connTimeout") != null ? ((Number) req.get("connTimeout")).intValue() : 30000)
                    .testQuery((String) req.get("testQuery"))
                    .description((String) req.get("description"))
                    .extraProps((String) req.get("extraProps"))
                    .build();
            repository.save(conn);
        }
        return toMap(conn);
    }

    @Transactional
    public void delete(String connId) {
        if ("SYSTEM_DB".equals(connId))
            throw new IllegalArgumentException("시스템 DB는 삭제할 수 없습니다.");
        DbConnection conn = repository.findById(connId)
                .orElseThrow(() -> new IllegalArgumentException("연결 정보를 찾을 수 없습니다: " + connId));
        repository.delete(conn);
    }

    // ─── 연결 테스트 ───────────────────────────────────────────

    public Map<String, Object> testConnection(String connId) {
        DbConnection conn = repository.findById(connId)
                .orElseThrow(() -> new IllegalArgumentException("연결 정보를 찾을 수 없습니다: " + connId));
        String url = (conn.getJdbcUrl() != null && !conn.getJdbcUrl().isBlank())
                ? conn.getJdbcUrl()
                : buildJdbcUrl(conn.getDbType(), conn.getHost(), conn.getPort(), conn.getDbName());
        return doTest(url, conn.getUsername(), conn.getPassword(), conn.getTestQuery(), conn.getDbType());
    }

    public Map<String, Object> testConnectionDirect(Map<String, Object> req) {
        String dbType  = (String) req.get("dbType");
        String host    = (String) req.get("host");
        Integer port   = req.get("port") != null ? ((Number) req.get("port")).intValue() : null;
        String dbName  = (String) req.get("dbName");
        String jdbcUrl = (String) req.get("jdbcUrl");
        String user    = (String) req.get("username");
        String pwd     = (String) req.get("password");
        String testSql = (String) req.getOrDefault("testQuery", defaultTestQuery(dbType));

        String url = (jdbcUrl != null && !jdbcUrl.isBlank())
                ? jdbcUrl
                : buildJdbcUrl(dbType, host, port, dbName);
        return doTest(url, user, pwd, testSql, dbType);
    }

    // ─── 런타임 상태 ──────────────────────────────────────────

    public Map<String, Object> getRuntimeStatus() {
        Map<String, Object> result = new LinkedHashMap<>();

        // SYSTEM_DB: Spring Boot가 관리하는 기본 DataSource
        result.put("SYSTEM_DB", buildSystemDbStatus());

        // 나머지 연결들
        repository.findAllByOrderByIsDefaultDescConnNameAsc().stream()
                .filter(c -> !"SYSTEM_DB".equals(c.getConnId()))
                .forEach(c -> result.put(c.getConnId(), buildConnStatus(c)));

        return result;
    }

    private Map<String, Object> buildSystemDbStatus() {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("isSystem", true);
        if (systemDataSource instanceof HikariDataSource hikari) {
            s.put("status", hikari.isRunning() ? "ACTIVE" : "STOPPED");
            s.put("registered", hikari.isRunning());
            appendPoolStats(s, hikari);
        } else {
            s.put("status", "ACTIVE");
            s.put("registered", true);
        }
        return s;
    }

    private Map<String, Object> buildConnStatus(DbConnection conn) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("isSystem", false);

        if (!"Y".equals(conn.getIsActive())) {
            s.put("status", "INACTIVE");
            s.put("registered", false);
            return s;
        }
        if (registry.isRegistered(conn.getConnId())) {
            s.put("status", "ACTIVE");
            s.put("registered", true);
            registry.get(conn.getConnId()).ifPresent(ds -> {
                if (ds instanceof HikariDataSource hikari) appendPoolStats(s, hikari);
            });
        } else if (registry.hasError(conn.getConnId())) {
            s.put("status", "ERROR");
            s.put("registered", false);
            s.put("error", registry.getError(conn.getConnId()));
        } else {
            // 활성이지만 아직 등록 안 됨 (재시작 전 신규 추가)
            s.put("status", "PENDING");
            s.put("registered", false);
        }
        return s;
    }

    private void appendPoolStats(Map<String, Object> s, HikariDataSource hikari) {
        try {
            HikariPoolMXBean pool = hikari.getHikariPoolMXBean();
            if (pool != null) {
                s.put("poolActive",  pool.getActiveConnections());
                s.put("poolIdle",    pool.getIdleConnections());
                s.put("poolTotal",   pool.getTotalConnections());
                s.put("poolWaiting", pool.getThreadsAwaitingConnection());
            }
        } catch (Exception ignored) {}
    }

    // ─── 내부 유틸 ────────────────────────────────────────────

    private Map<String, Object> doTest(String url, String user, String pwd, String testQuery, String dbType) {
        long start = System.currentTimeMillis();
        try {
            loadDriver(dbType);
            try (Connection c = DriverManager.getConnection(url,
                    user != null ? user : "",
                    pwd  != null ? pwd  : "")) {
                String sql = (testQuery != null && !testQuery.isBlank()) ? testQuery : defaultTestQuery(dbType);
                try (Statement st = c.createStatement()) {
                    st.execute(sql);
                }
            }
            long elapsed = System.currentTimeMillis() - start;
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("message", "연결 성공");
            result.put("elapsedMs", elapsed);
            return result;
        } catch (Exception e) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("message", e.getMessage());
            return result;
        }
    }

    private void loadDriver(String dbType) throws ClassNotFoundException {
        if (dbType == null) return;
        switch (dbType.toUpperCase()) {
            case "MYSQL"      -> Class.forName("com.mysql.cj.jdbc.Driver");
            case "POSTGRESQL" -> Class.forName("org.postgresql.Driver");
            case "MARIADB"    -> Class.forName("org.mariadb.jdbc.Driver");
            case "H2"         -> Class.forName("org.h2.Driver");
            // Oracle, MSSQL은 드라이버가 클래스패스에 없으면 JDBC URL 직접 입력으로 안내
        }
    }

    private String buildJdbcUrl(String dbType, String host, Integer port, String dbName) {
        if (dbType == null) return "";
        return switch (dbType.toUpperCase()) {
            case "MYSQL"      -> String.format("jdbc:mysql://%s:%d/%s?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8",
                    host, port != null ? port : 3306, dbName);
            case "POSTGRESQL" -> String.format("jdbc:postgresql://%s:%d/%s",
                    host, port != null ? port : 5432, dbName);
            case "MARIADB"    -> String.format("jdbc:mariadb://%s:%d/%s",
                    host, port != null ? port : 3306, dbName);
            case "ORACLE"     -> String.format("jdbc:oracle:thin:@%s:%d:%s",
                    host, port != null ? port : 1521, dbName);
            case "MSSQL"      -> String.format("jdbc:sqlserver://%s:%d;databaseName=%s",
                    host, port != null ? port : 1433, dbName);
            case "H2"         -> String.format("jdbc:h2:tcp://%s:%d/%s",
                    host, port != null ? port : 9092, dbName);
            default -> "";
        };
    }

    private String defaultTestQuery(String dbType) {
        if (dbType == null) return "SELECT 1";
        return switch (dbType.toUpperCase()) {
            case "ORACLE" -> "SELECT 1 FROM DUAL";
            default       -> "SELECT 1";
        };
    }

    private Map<String, Object> toMap(DbConnection c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("connId",      c.getConnId());
        m.put("connName",    c.getConnName());
        m.put("dbType",      c.getDbType());
        m.put("host",        c.getHost());
        m.put("port",        c.getPort());
        m.put("dbName",      c.getDbName());
        m.put("schemaName",  c.getSchemaName());
        m.put("username",    c.getUsername());
        m.put("password",    maskPassword(c.getPassword()));  // 응답 시 마스킹
        m.put("jdbcUrl",     c.getJdbcUrl());
        m.put("xaClass",     c.getXaClass());
        m.put("isXa",        c.getIsXa());
        m.put("isActive",    c.getIsActive());
        m.put("isDefault",   c.getIsDefault());
        m.put("poolMin",     c.getPoolMin());
        m.put("poolMax",     c.getPoolMax());
        m.put("connTimeout", c.getConnTimeout());
        m.put("testQuery",   c.getTestQuery());
        m.put("description", c.getDescription());
        m.put("extraProps",  c.getExtraProps());
        m.put("createdAt",   c.getCreatedAt());
        m.put("updatedAt",   c.getUpdatedAt());
        return m;
    }

    private String maskPassword(String pwd) {
        if (pwd == null || pwd.isBlank()) return "";
        return "••••••••";
    }
}
