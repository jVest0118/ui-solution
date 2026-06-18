package com.uisolution.platform.datasource.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "db_connection")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DbConnection {

    @Id
    @Column(name = "conn_id", length = 50)
    private String connId;

    @Column(name = "conn_name", nullable = false, length = 200)
    private String connName;

    @Column(name = "db_type", nullable = false, length = 30)
    private String dbType;

    @Column(name = "host", length = 500)
    private String host;

    @Column(name = "port")
    private Integer port;

    @Column(name = "db_name", length = 200)
    private String dbName;

    @Column(name = "schema_name", length = 200)
    private String schemaName;

    @Column(name = "username", length = 200)
    private String username;

    @Column(name = "password", length = 500)
    private String password;

    // host/port/dbName 대신 직접 지정하는 JDBC URL (우선 적용)
    @Column(name = "jdbc_url", length = 1000)
    private String jdbcUrl;

    // XA DataSource 클래스명 (XA 모드에서 사용)
    @Column(name = "xa_class", length = 500)
    private String xaClass;

    @Column(name = "is_xa", length = 1)
    @Builder.Default
    private String isXa = "N";

    @Column(name = "is_active", length = 1)
    @Builder.Default
    private String isActive = "Y";

    @Column(name = "is_default", length = 1)
    @Builder.Default
    private String isDefault = "N";

    @Column(name = "pool_min")
    @Builder.Default
    private int poolMin = 2;

    @Column(name = "pool_max")
    @Builder.Default
    private int poolMax = 10;

    @Column(name = "conn_timeout")
    @Builder.Default
    private int connTimeout = 30000;

    @Column(name = "test_query", length = 500)
    private String testQuery;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "extra_props", columnDefinition = "TEXT")
    private String extraProps;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    public void update(String connName, String dbType, String host, Integer port,
                       String dbName, String schemaName, String username, String password,
                       String jdbcUrl, String xaClass, String isXa, String isActive,
                       String isDefault, int poolMin, int poolMax, int connTimeout,
                       String testQuery, String description, String extraProps) {
        this.connName    = connName;
        this.dbType      = dbType;
        this.host        = host;
        this.port        = port;
        this.dbName      = dbName;
        this.schemaName  = schemaName;
        this.username    = username;
        if (password != null && !password.isBlank()) this.password = password;
        this.jdbcUrl     = jdbcUrl;
        this.xaClass     = xaClass;
        this.isXa        = isXa != null ? isXa : "N";
        this.isActive    = isActive != null ? isActive : "Y";
        this.isDefault   = isDefault != null ? isDefault : "N";
        this.poolMin     = poolMin;
        this.poolMax     = poolMax;
        this.connTimeout = connTimeout;
        this.testQuery   = testQuery;
        this.description = description;
        this.extraProps  = extraProps;
        this.updatedAt   = LocalDateTime.now();
    }
}
