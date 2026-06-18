-- V14: DB 연결 관리 메뉴를 UI Solution 관리에서 사이트 관리로 이동

-- 1. MNU001_05 (DB 연결 관리)를 MNU003 (사이트 관리) 하위로 이동
--    sort_order 3번으로 배치 (사이트 메뉴 설정=1, 사이트 사용자 관리=2 다음)
UPDATE menu_def
SET parent_id  = 'MNU003',
    sort_order = 3
WHERE menu_id = 'MNU001_05';

-- 2. SCREEN_ADMIN에게도 DB 연결 관리 메뉴 접근 허용
--    (사이트 관리 그룹으로 이동했으므로 SCREEN_ADMIN도 접근 가능해야 함)
INSERT INTO role_menu (role_id, menu_id)
SELECT 'SCREEN_ADMIN', 'MNU001_05'
WHERE NOT EXISTS (
    SELECT 1 FROM role_menu WHERE role_id = 'SCREEN_ADMIN' AND menu_id = 'MNU001_05'
);
