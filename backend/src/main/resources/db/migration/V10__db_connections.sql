-- DB 연결 설정 테이블
CREATE TABLE IF NOT EXISTS db_connection (
    conn_id      VARCHAR(50)   NOT NULL,
    conn_name    VARCHAR(200)  NOT NULL,
    db_type      VARCHAR(30)   NOT NULL,
    host         VARCHAR(500),
    port         INTEGER,
    db_name      VARCHAR(200),
    schema_name  VARCHAR(200),
    username     VARCHAR(200),
    password     VARCHAR(500),
    jdbc_url     VARCHAR(1000),
    xa_class     VARCHAR(500),
    is_xa        CHAR(1)       NOT NULL DEFAULT 'N',
    is_active    CHAR(1)       NOT NULL DEFAULT 'Y',
    is_default   CHAR(1)       NOT NULL DEFAULT 'N',
    pool_min     INTEGER       NOT NULL DEFAULT 2,
    pool_max     INTEGER       NOT NULL DEFAULT 10,
    conn_timeout INTEGER       NOT NULL DEFAULT 30000,
    test_query   VARCHAR(500),
    description  VARCHAR(1000),
    extra_props  TEXT,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_db_connection PRIMARY KEY (conn_id)
);

-- 시스템 MySQL DB를 기본 연결로 등록
INSERT INTO db_connection (
    conn_id, conn_name, db_type,
    jdbc_url, username, password,
    is_xa, is_active, is_default,
    test_query, description
) VALUES (
    'SYSTEM_DB', '시스템 DB (MySQL)', 'MYSQL',
    'jdbc:mysql://localhost:3306/uisolution?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Seoul', 'uisolution', 'uisolution123',
    'N', 'Y', 'Y',
    'SELECT 1', '플랫폼 시스템 데이터베이스 (시스템 관리용)'
);
