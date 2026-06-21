-- V18: Git 형상관리 메뉴 추가

INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order)
VALUES
  ('MNU004',    NULL,     'Git 형상관리',   NULL,                  'BranchesOutlined',   4),
  ('MNU004_01', 'MNU004', '변경사항 / 커밋', '/admin/git',         'CodeOutlined',       1),
  ('MNU004_02', 'MNU004', '저장소 설정',    '/admin/git/settings', 'SettingOutlined',    2);

-- SYSTEM_ADMIN: Git 전체
INSERT INTO role_menu (role_id, menu_id)
VALUES ('SYSTEM_ADMIN', 'MNU004'),
       ('SYSTEM_ADMIN', 'MNU004_01'),
       ('SYSTEM_ADMIN', 'MNU004_02');

-- SCREEN_ADMIN: Git 전체
INSERT INTO role_menu (role_id, menu_id)
VALUES ('SCREEN_ADMIN', 'MNU004'),
       ('SCREEN_ADMIN', 'MNU004_01'),
       ('SCREEN_ADMIN', 'MNU004_02');

-- DEVELOPER: Git 전체
INSERT INTO role_menu (role_id, menu_id)
VALUES ('DEVELOPER', 'MNU004'),
       ('DEVELOPER', 'MNU004_01'),
       ('DEVELOPER', 'MNU004_02');
