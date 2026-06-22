-- V34: 연계API 관리 기능 추가

CREATE TABLE IF NOT EXISTS api_connection (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    conn_nm     VARCHAR(100) NOT NULL,
    base_url    VARCHAR(500) NOT NULL,
    health_url  VARCHAR(500),
    method      VARCHAR(10)  NOT NULL DEFAULT 'GET',
    req_headers TEXT,
    timeout_ms  INT          NOT NULL DEFAULT 5000,
    description VARCHAR(500),
    project_id  VARCHAR(50),
    use_yn      CHAR(1)      NOT NULL DEFAULT 'Y',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by  VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 메뉴 등록 ──────────────────────────────────────────────────
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order, use_yn)
VALUES ('MNU002_API', 'MNU002', '연계API', NULL, 'api', 5, 'Y');

INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order, use_yn)
VALUES ('MNU002_API_01', 'MNU002_API', '연계API 설정', '/admin/api-connections', 'setting', 1, 'Y');

INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order, use_yn)
VALUES ('MNU002_API_02', 'MNU002_API', 'API 상태조회', '/admin/api-status', 'dashboard', 2, 'Y');

-- ── 역할별 메뉴 권한 부여 ──────────────────────────────────────
INSERT INTO role_menu (role_id, menu_id) VALUES
('SYSTEM_ADMIN', 'MNU002_API'),    ('SYSTEM_ADMIN', 'MNU002_API_01'), ('SYSTEM_ADMIN', 'MNU002_API_02'),
('SCREEN_ADMIN', 'MNU002_API'),    ('SCREEN_ADMIN', 'MNU002_API_01'), ('SCREEN_ADMIN', 'MNU002_API_02'),
('DEVELOPER',    'MNU002_API'),    ('DEVELOPER',    'MNU002_API_01'), ('DEVELOPER',    'MNU002_API_02');
