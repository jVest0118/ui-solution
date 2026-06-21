-- 화면별 데이터 소스 정의 (SQL 바인딩 기반 no-code 데이터 연동)
CREATE TABLE IF NOT EXISTS screen_data_source (
    id          BIGINT       AUTO_INCREMENT,
    screen_id   VARCHAR(50)  NOT NULL,
    source_nm   VARCHAR(100) NOT NULL,
    source_type VARCHAR(20)  NOT NULL DEFAULT 'SQL',
    conn_id     VARCHAR(50),                          -- NULL = 시스템 DB
    sql_text    TEXT,                                  -- :paramName 방식 named params 사용
    params_def  TEXT,                                  -- JSON: 파라미터 정의 목록
    description VARCHAR(500),
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_screen_data_source PRIMARY KEY (id),
    CONSTRAINT uk_sds_screen_nm UNIQUE (screen_id, source_nm)
);

CREATE INDEX idx_sds_screen ON screen_data_source (screen_id);
