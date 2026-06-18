-- V11: 데이터베이스 연결 관리 메뉴 추가 (SYSTEM_ADMIN 전용)

INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order)
VALUES ('MNU001_05', 'MNU001', 'DB 연결 관리', '/admin/datasource', 'DatabaseOutlined', 5);

-- SYSTEM_ADMIN에만 부여 (datasource API가 SYSTEM_ADMIN 전용이므로)
INSERT INTO role_menu (role_id, menu_id)
VALUES ('SYSTEM_ADMIN', 'MNU001_05');
