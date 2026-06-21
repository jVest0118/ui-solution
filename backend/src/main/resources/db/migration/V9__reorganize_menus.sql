-- V9: 관리자 메뉴 구조 재편
-- 기존 메뉴/권한 전체 초기화 후 새 구조로 재삽입

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM role_menu;
DELETE FROM menu_def;
SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────────
-- 1. UI Solution 관리 (플랫폼 자체 설정 - SYSTEM_ADMIN 전용)
-- ─────────────────────────────────────────────────────────
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order) VALUES
('MNU001',    NULL,     'UI Solution 관리', NULL,                   'SettingOutlined',            1),
('MNU001_01', 'MNU001', '사용자 관리',      '/admin/users',         'UserOutlined',               1),
('MNU001_02', 'MNU001', '역할/권한 관리',   '/admin/roles',         'SafetyCertificateOutlined',  2),
('MNU001_03', 'MNU001', '메뉴 관리',        '/admin/menus',         'MenuOutlined',               3),
('MNU001_04', 'MNU001', '프로젝트 관리',    '/admin/projects',      'FolderOpenOutlined',         4);

-- ─────────────────────────────────────────────────────────
-- 2. 화면 개발 (프로젝트 개발 도구 - 개발자/어드민 공통)
-- ─────────────────────────────────────────────────────────
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order) VALUES
('MNU002',    NULL,     '화면 개발',        NULL,                   'AppstoreOutlined',           2),
('MNU002_01', 'MNU002', '화면 목록',        '/admin/screens',       'LayoutOutlined',             1),
('MNU002_02', 'MNU002', '공통 코드',        '/admin/codes',         'TagOutlined',                2),
('MNU002_03', 'MNU002', '파일 업로드 설정', '/admin/upload-settings','UploadOutlined',            3);

-- ─────────────────────────────────────────────────────────
-- 3. 사이트 관리 (개발한 사이트 운영 - 어드민 공통)
-- ─────────────────────────────────────────────────────────
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order) VALUES
('MNU003',    NULL,     '사이트 관리',       NULL,                  'GlobalOutlined',             3),
('MNU003_01', 'MNU003', '사이트 메뉴 설정', '/admin/site/menus',   'ApartmentOutlined',          1),
('MNU003_02', 'MNU003', '사이트 사용자 관리','/admin/site/users',  'TeamOutlined',               2);

-- ─────────────────────────────────────────────────────────
-- 역할별 메뉴 권한 재설정
-- ─────────────────────────────────────────────────────────

-- SYSTEM_ADMIN: 전체 메뉴
INSERT INTO role_menu (role_id, menu_id)
SELECT 'SYSTEM_ADMIN', menu_id FROM menu_def;

-- SCREEN_ADMIN: 화면 개발 + 사이트 관리 (플랫폼 관리 제외)
INSERT INTO role_menu (role_id, menu_id)
SELECT 'SCREEN_ADMIN', menu_id FROM menu_def
WHERE menu_id IN ('MNU002','MNU002_01','MNU002_02','MNU002_03',
                  'MNU003','MNU003_01','MNU003_02');

-- DEVELOPER: 화면 개발만
INSERT INTO role_menu (role_id, menu_id)
SELECT 'DEVELOPER', menu_id FROM menu_def
WHERE menu_id IN ('MNU002','MNU002_01','MNU002_02','MNU002_03');
