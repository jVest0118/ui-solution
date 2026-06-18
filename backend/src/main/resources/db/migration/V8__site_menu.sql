-- V8: 사이트 메뉴 및 사이트 설정

CREATE TABLE IF NOT EXISTS site_config (
    project_id   VARCHAR(50)  NOT NULL,
    site_nm      VARCHAR(100) NOT NULL DEFAULT '내 사이트',
    nav_style    VARCHAR(20)  NOT NULL DEFAULT 'top-side',
    CONSTRAINT pk_site_config PRIMARY KEY (project_id)
);

-- 기본 프로젝트 사이트 설정 초기화
INSERT INTO site_config (project_id, site_nm, nav_style)
SELECT 'DEMO', 'Demo Site', 'top-side'
WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE project_id = 'DEMO');

CREATE TABLE IF NOT EXISTS site_menu (
    menu_id      VARCHAR(50)  NOT NULL,
    project_id   VARCHAR(50),
    parent_id    VARCHAR(50),
    menu_nm      VARCHAR(100) NOT NULL,
    screen_id    VARCHAR(50),
    menu_url     VARCHAR(500),
    icon         VARCHAR(50),
    sort_order   INT          NOT NULL DEFAULT 0,
    use_yn       VARCHAR(1)   NOT NULL DEFAULT 'Y',
    CONSTRAINT pk_site_menu PRIMARY KEY (menu_id)
);

-- 사이트 관리 메뉴 추가 (System Mgmt 아래)
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order, project_id)
SELECT 'MNU001_06', 'MNU001', '사이트 메뉴 설정', '/admin/site/menus', 'GlobalOutlined', 6, NULL
WHERE NOT EXISTS (SELECT 1 FROM menu_def WHERE menu_id = 'MNU001_06');

INSERT INTO role_menu (role_id, menu_id)
SELECT 'SYSTEM_ADMIN', 'MNU001_06'
WHERE NOT EXISTS (SELECT 1 FROM role_menu WHERE role_id = 'SYSTEM_ADMIN' AND menu_id = 'MNU001_06');

-- 사이트 사용자 관리 메뉴
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order, project_id)
SELECT 'MNU001_07', 'MNU001', '사이트 사용자 관리', '/admin/site/users', 'TeamOutlined', 7, NULL
WHERE NOT EXISTS (SELECT 1 FROM menu_def WHERE menu_id = 'MNU001_07');

INSERT INTO role_menu (role_id, menu_id)
SELECT 'SYSTEM_ADMIN', 'MNU001_07'
WHERE NOT EXISTS (SELECT 1 FROM role_menu WHERE role_id = 'SYSTEM_ADMIN' AND menu_id = 'MNU001_07');
