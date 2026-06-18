-- V15: 사이트 역할/권한 관리
-- 플랫폼 역할(role_def)과 별개로 각 사이트(프로젝트) 별 역할 관리

-- ─────────────────────────────────────────────────────────
-- 1. 사이트 역할 정의
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_role (
    role_id     VARCHAR(50)   NOT NULL,
    project_id  VARCHAR(50)   NOT NULL,
    role_nm     VARCHAR(100)  NOT NULL,
    role_desc   VARCHAR(500),
    sort_order  INT           NOT NULL DEFAULT 0,
    use_yn      VARCHAR(1)    NOT NULL DEFAULT 'Y',
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(50),
    CONSTRAINT pk_site_role PRIMARY KEY (role_id, project_id),
    CONSTRAINT fk_sr_project FOREIGN KEY (project_id) REFERENCES project(project_id)
);

-- ─────────────────────────────────────────────────────────
-- 2. 사이트 사용자-역할 매핑
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_user_role (
    user_id     VARCHAR(50)   NOT NULL,
    role_id     VARCHAR(50)   NOT NULL,
    project_id  VARCHAR(50)   NOT NULL,
    granted_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by  VARCHAR(50),
    CONSTRAINT pk_site_user_role PRIMARY KEY (user_id, role_id, project_id),
    CONSTRAINT fk_sur_user    FOREIGN KEY (user_id)              REFERENCES usr_info(user_id),
    CONSTRAINT fk_sur_role    FOREIGN KEY (role_id, project_id)  REFERENCES site_role(role_id, project_id)
);

-- ─────────────────────────────────────────────────────────
-- 3. 사이트 역할-화면 권한 매핑
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_role_screen (
    role_id     VARCHAR(50)   NOT NULL,
    project_id  VARCHAR(50)   NOT NULL,
    screen_id   VARCHAR(50)   NOT NULL,
    can_read    VARCHAR(1)    NOT NULL DEFAULT 'Y',
    can_create  VARCHAR(1)    NOT NULL DEFAULT 'N',
    can_update  VARCHAR(1)    NOT NULL DEFAULT 'N',
    can_delete  VARCHAR(1)    NOT NULL DEFAULT 'N',
    can_excel   VARCHAR(1)    NOT NULL DEFAULT 'N',
    CONSTRAINT pk_site_role_screen PRIMARY KEY (role_id, project_id, screen_id),
    CONSTRAINT fk_srs_role   FOREIGN KEY (role_id, project_id) REFERENCES site_role(role_id, project_id),
    CONSTRAINT fk_srs_screen FOREIGN KEY (screen_id)           REFERENCES screen_def(screen_id)
);

-- ─────────────────────────────────────────────────────────
-- 4. 사이트 관리 메뉴에 역할 관리 추가
-- ─────────────────────────────────────────────────────────
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order)
VALUES ('MNU003_03', 'MNU003', '사이트 역할 관리', '/admin/site/roles', 'SafetyCertificateOutlined', 3);

-- SYSTEM_ADMIN 에게 메뉴 부여
INSERT INTO role_menu (role_id, menu_id) VALUES ('SYSTEM_ADMIN', 'MNU003_03');

-- SCREEN_ADMIN 에게도 사이트 역할 관리 접근 허용
INSERT INTO role_menu (role_id, menu_id) VALUES ('SCREEN_ADMIN', 'MNU003_03');

-- ─────────────────────────────────────────────────────────
-- 5. DEMO 프로젝트 기본 역할 샘플 데이터
-- ─────────────────────────────────────────────────────────
INSERT INTO site_role (role_id, project_id, role_nm, role_desc, sort_order, created_by) VALUES
('SITE_ADMIN', 'DEMO', '사이트 관리자', '모든 화면 접근 및 관리 권한', 1, 'system'),
('SITE_USER',  'DEMO', '일반 사용자',  '허용된 화면 조회 권한',        2, 'system');
