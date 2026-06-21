package com.uisolution.platform.datasource;

import com.uisolution.platform.datasource.entity.DbConnection;
import com.uisolution.platform.datasource.repository.DbConnectionRepository;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DynamicDataSourceInitializer implements ApplicationRunner {

    private final DbConnectionRepository repository;
    private final DataSourceRegistry     registry;
    private final DataSource             primaryDataSource;

    @Override
    public void run(ApplicationArguments args) {
        List<DbConnection> all = repository.findAllByOrderByIsDefaultDescConnNameAsc();
        int success = 0, fail = 0;

        for (DbConnection conn : all) {
            if (!"Y".equals(conn.getIsActive())) continue;          // 비활성 연결 스킵

            try {
                HikariConfig cfg = buildConfig(conn);
                HikariDataSource ds = new HikariDataSource(cfg);
                registry.register(conn.getConnId(), ds);
                log.info("[DataSource] ✅ 등록 완료: {} ({})", conn.getConnId(), conn.getDbType());
                success++;
            } catch (Exception e) {
                registry.registerError(conn.getConnId(), e.getMessage());
                log.error("[DataSource] ❌ 등록 실패: {} — {}", conn.getConnId(), e.getMessage());
                fail++;
            }
        }

        log.info("[DataSource] 초기화 완료 — 성공: {}, 실패: {}", success, fail);
    }

    private HikariConfig buildConfig(DbConnection conn) {
        HikariConfig cfg = new HikariConfig();
        cfg.setPoolName("HikariPool-" + conn.getConnId());
        cfg.setJdbcUrl(resolveUrl(conn));

        if (conn.getUsername() != null && !conn.getUsername().isBlank())
            cfg.setUsername(conn.getUsername());
        if (conn.getPassword() != null && !conn.getPassword().isBlank())
            cfg.setPassword(conn.getPassword());

        cfg.setMinimumIdle(conn.getPoolMin());
        cfg.setMaximumPoolSize(conn.getPoolMax());
        cfg.setConnectionTimeout(conn.getConnTimeout());
        cfg.setInitializationFailTimeout(-1); // 연결 실패해도 풀 자체는 생성 (lazy init)

        if (conn.getTestQuery() != null && !conn.getTestQuery().isBlank())
            cfg.setConnectionTestQuery(conn.getTestQuery());

        return cfg;
    }

    private String resolveUrl(DbConnection conn) {
        if (conn.getJdbcUrl() != null && !conn.getJdbcUrl().isBlank())
            return conn.getJdbcUrl();

        String host   = conn.getHost()   != null ? conn.getHost()   : "localhost";
        String dbName = conn.getDbName() != null ? conn.getDbName() : "";
        int    port;

        return switch (conn.getDbType().toUpperCase()) {
            case "MYSQL" -> {
                port = conn.getPort() != null ? conn.getPort() : 3306;
                yield String.format("jdbc:mysql://%s:%d/%s?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=UTF-8",
                        host, port, dbName);
            }
            case "POSTGRESQL" -> {
                port = conn.getPort() != null ? conn.getPort() : 5432;
                yield String.format("jdbc:postgresql://%s:%d/%s", host, port, dbName);
            }
            case "MARIADB" -> {
                port = conn.getPort() != null ? conn.getPort() : 3306;
                yield String.format("jdbc:mariadb://%s:%d/%s", host, port, dbName);
            }
            case "ORACLE" -> {
                port = conn.getPort() != null ? conn.getPort() : 1521;
                yield String.format("jdbc:oracle:thin:@%s:%d:%s", host, port, dbName);
            }
            case "MSSQL" -> {
                port = conn.getPort() != null ? conn.getPort() : 1433;
                yield String.format("jdbc:sqlserver://%s:%d;databaseName=%s", host, port, dbName);
            }
            default -> "";
        };
    }
}
