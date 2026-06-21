-- V22: 연락처 메뉴 추가

INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order)
VALUES ('MNU005', NULL, '연락처', '/contacts', 'ContactsOutlined', 5);

-- 전체 역할 접근 허용
INSERT INTO role_menu (role_id, menu_id)
VALUES ('SYSTEM_ADMIN', 'MNU005'),
       ('SCREEN_ADMIN', 'MNU005'),
       ('DEVELOPER',    'MNU005'),
       ('USER',         'MNU005');
