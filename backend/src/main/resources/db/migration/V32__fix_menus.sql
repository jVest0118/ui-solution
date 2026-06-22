-- V32: 메뉴 정리
--   1. 상품 관리 메뉴 제거 (데모용으로 생성된 것, 요청 없이 추가됨)
--   2. 페이지 구성 메뉴를 "화면 개발" 하위로 이동

-- ─────────────────────────────────────────────────────────────
-- 1. 상품 관리 메뉴 제거
-- ─────────────────────────────────────────────────────────────
DELETE FROM role_menu WHERE menu_id IN (
    'MNU_PRODUCT', 'MNU_PRODUCT_MD', 'MNU_PRODUCT_LST', 'MNU_PRODUCT_DTL'
);
DELETE FROM menu_def WHERE menu_id IN (
    'MNU_PRODUCT_MD', 'MNU_PRODUCT_LST', 'MNU_PRODUCT_DTL'
);
DELETE FROM menu_def WHERE menu_id = 'MNU_PRODUCT';

-- ─────────────────────────────────────────────────────────────
-- 2. 페이지 구성 메뉴 → "화면 개발 (MNU002)" 하위로 이동
-- ─────────────────────────────────────────────────────────────
UPDATE menu_def
SET parent_id  = 'MNU002',
    sort_order = 4,
    menu_nm    = '페이지 구성'
WHERE menu_id = 'MNU_PAGE_COMPOSER';
