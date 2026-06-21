-- ============================================================
-- V30: 상품 마스터-디테일 화면 예제
--   1. PRODUCT_LIST   - 상품 목록 (그리드, external_table → product)
--   2. PRODUCT_DETAIL - 상품 스펙 (폼, external_table → product_detail)
--   3. PRODUCT_MD     - 복합 화면 (composite): 위=목록, 아래=스펙
--   + 메뉴 등록
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. 상품 목록 화면 (PRODUCT_LIST) - grid / external_table
-- ─────────────────────────────────────────────────────────────
INSERT INTO screen_def (
  screen_id, screen_nm, screen_type, description, project_id,
  use_yn, version, open_type, edit_status, last_editor,
  datasource_type, table_nm, pk_column,
  layout_config, button_config
) VALUES (
  'PRODUCT_LIST',
  '상품 목록',
  'grid',
  '삼성전자 상품 목록. product 테이블에서 직접 조회하는 외부 테이블 연결 그리드 화면.',
  'DEMO',
  'Y', 1, 'page', 'COMMITTED', NULL,
  'external_table', 'product', 'product_id',
  '{"formCols": 2, "useAgGrid": true}',
  '{"align":"right","buttons":[{"action":"submit","label":"저장"},{"action":"reset","label":"초기화","visible":true}]}'
);

-- 상품 목록 필드 정의
INSERT INTO field_def (screen_id, field_nm, field_label, field_type,
  sort_order, col_span, row_span, row_pos, col_pos,
  readonly_yn, hidden_yn, use_yn, placeholder, column_nm)
VALUES
('PRODUCT_LIST', 'product_id',   '상품코드',   'text',   0, 1,1,0,0, 'N','N','Y','예) P-SM-001', 'product_id'),
('PRODUCT_LIST', 'category',     '카테고리',   'text',   1, 1,1,0,1, 'N','N','Y','카테고리',     'category'),
('PRODUCT_LIST', 'sub_category', '서브카테고리','text',  2, 1,1,1,0, 'N','N','Y','서브카테고리', 'sub_category'),
('PRODUCT_LIST', 'product_nm',   '상품명',     'text',   3, 1,1,1,1, 'N','N','Y','상품명',       'product_nm'),
('PRODUCT_LIST', 'brand',        '브랜드',     'text',   4, 1,1,2,0, 'N','N','Y','브랜드',       'brand'),
('PRODUCT_LIST', 'model_no',     '모델번호',   'text',   5, 1,1,2,1, 'N','N','Y','모델번호',     'model_no'),
('PRODUCT_LIST', 'price',        '정가',       'number', 6, 1,1,3,0, 'N','N','Y','정가',         'price'),
('PRODUCT_LIST', 'sale_price',   '판매가',     'number', 7, 1,1,3,1, 'N','N','Y','판매가',       'sale_price'),
('PRODUCT_LIST', 'stock_qty',    '재고',       'number', 8, 1,1,4,0, 'N','N','Y','재고수량',     'stock_qty'),
('PRODUCT_LIST', 'status',       '판매상태',   'text',   9, 1,1,4,1, 'N','N','Y','상태',         'status'),
('PRODUCT_LIST', 'rating',       '평점',       'number',10, 1,1,5,0, 'N','N','Y','평점',         'rating'),
('PRODUCT_LIST', 'review_cnt',   '리뷰수',     'number',11, 1,1,5,1, 'N','N','Y','리뷰수',       'review_cnt'),
('PRODUCT_LIST', 'release_date', '출시일',     'date',  12, 1,1,6,0, 'N','N','Y','출시일',       'release_date');

-- 상품 목록 권한
INSERT INTO role_screen (role_id, screen_id, can_read, can_create, can_update, can_delete)
VALUES
('SYSTEM_ADMIN', 'PRODUCT_LIST', 'Y','Y','Y','Y'),
('SCREEN_ADMIN', 'PRODUCT_LIST', 'Y','Y','Y','Y'),
('DEVELOPER',    'PRODUCT_LIST', 'Y','Y','Y','Y'),
('USER',         'PRODUCT_LIST', 'Y','N','N','N');

-- ─────────────────────────────────────────────────────────────
-- 2. 상품 스펙 화면 (PRODUCT_DETAIL) - form / external_table
-- ─────────────────────────────────────────────────────────────
INSERT INTO screen_def (
  screen_id, screen_nm, screen_type, description, project_id,
  use_yn, version, open_type, edit_status, last_editor,
  datasource_type, table_nm, pk_column,
  layout_config, button_config
) VALUES (
  'PRODUCT_DETAIL',
  '상품 스펙 상세',
  'grid',
  '상품별 스펙 상세 정보. product_detail 테이블 연결. PRODUCT_MD 복합 화면에서 디테일 섹션으로 사용됩니다.',
  'DEMO',
  'Y', 1, 'page', 'COMMITTED', NULL,
  'external_table', 'product_detail', 'detail_id',
  '{"formCols": 2, "useAgGrid": true}',
  '{"align":"right","buttons":[{"action":"submit","label":"저장"},{"action":"reset","label":"초기화","visible":true}]}'
);

-- 상품 스펙 필드 정의
INSERT INTO field_def (screen_id, field_nm, field_label, field_type,
  sort_order, col_span, row_span, row_pos, col_pos,
  readonly_yn, hidden_yn, use_yn, placeholder, column_nm)
VALUES
('PRODUCT_DETAIL', 'detail_id',   '스펙ID',   'number', 0, 1,1,0,0, 'Y','N','Y', NULL,        'detail_id'),
('PRODUCT_DETAIL', 'product_id',  '상품코드', 'text',   1, 1,1,0,1, 'N','N','Y','상품코드',   'product_id'),
('PRODUCT_DETAIL', 'spec_group',  '스펙그룹', 'text',   2, 1,1,1,0, 'N','N','Y','예) 디스플레이', 'spec_group'),
('PRODUCT_DETAIL', 'spec_key',    '스펙항목', 'text',   3, 1,1,1,1, 'N','N','Y','예) 화면크기',   'spec_key'),
('PRODUCT_DETAIL', 'spec_value',  '스펙값',   'text',   4, 2,1,2,0, 'N','N','Y','스펙 값',        'spec_value'),
('PRODUCT_DETAIL', 'sort_order',  '정렬순서', 'number', 5, 1,1,3,0, 'N','N','Y','정렬',           'sort_order'),
('PRODUCT_DETAIL', 'description', '설명',     'textarea',6,2,1,4,0, 'N','N','Y','추가 설명',      'description');

-- 상품 스펙 권한
INSERT INTO role_screen (role_id, screen_id, can_read, can_create, can_update, can_delete)
VALUES
('SYSTEM_ADMIN', 'PRODUCT_DETAIL', 'Y','Y','Y','Y'),
('SCREEN_ADMIN', 'PRODUCT_DETAIL', 'Y','Y','Y','Y'),
('DEVELOPER',    'PRODUCT_DETAIL', 'Y','Y','Y','Y'),
('USER',         'PRODUCT_DETAIL', 'Y','N','N','N');

-- ─────────────────────────────────────────────────────────────
-- 3. 상품 마스터-디테일 복합 화면 (PRODUCT_MD) - composite
--    상단: PRODUCT_LIST 화면(그리드)  → 마스터
--    하단: PRODUCT_DETAIL 화면(그리드) → 디테일 (product_id 조인)
-- ─────────────────────────────────────────────────────────────
INSERT INTO screen_def (
  screen_id, screen_nm, screen_type, description, project_id,
  use_yn, version, open_type, edit_status, last_editor,
  layout_config, button_config
) VALUES (
  'PRODUCT_MD',
  '상품 마스터-디테일',
  'composite',
  '상단 그리드(product)에서 상품을 선택하면 하단 그리드(product_detail)에 해당 상품의 스펙 목록이 자동으로 표시되는 마스터-디테일 복합 화면 예제.',
  'DEMO',
  'Y', 1, 'page', 'COMMITTED', NULL,
  '{"formCols": 2, "sections": [
    {
      "id": "s_product",
      "type": "grid",
      "role": "master",
      "title": "상품 목록",
      "height": 320,
      "screenId": "PRODUCT_LIST"
    },
    {
      "id": "s_detail",
      "type": "grid",
      "role": "detail",
      "masterSectionId": "s_product",
      "title": "스펙 상세 (상단 상품 선택 시 자동 조회)",
      "height": 300,
      "screenId": "PRODUCT_DETAIL",
      "linkField": "product_id"
    }
  ]}',
  '{}'
);

-- 복합 화면 권한
INSERT INTO role_screen (role_id, screen_id, can_read, can_create, can_update, can_delete)
VALUES
('SYSTEM_ADMIN', 'PRODUCT_MD', 'Y','Y','Y','Y'),
('SCREEN_ADMIN', 'PRODUCT_MD', 'Y','Y','Y','Y'),
('DEVELOPER',    'PRODUCT_MD', 'Y','Y','Y','Y'),
('USER',         'PRODUCT_MD', 'Y','N','N','N');

-- ─────────────────────────────────────────────────────────────
-- 4. 메뉴 등록 (상품 관리)
-- ─────────────────────────────────────────────────────────────
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order)
VALUES
  ('MNU_PRODUCT',    NULL,           '상품 관리',        '/product',            'ShoppingOutlined',     10),
  ('MNU_PRODUCT_MD', 'MNU_PRODUCT',  '상품 마스터-디테일', '/app/PRODUCT_MD',   'AppstoreOutlined',      1),
  ('MNU_PRODUCT_LST','MNU_PRODUCT',  '상품 목록',         '/app/PRODUCT_LIST',  'UnorderedListOutlined', 2),
  ('MNU_PRODUCT_DTL','MNU_PRODUCT',  '상품 스펙 상세',    '/app/PRODUCT_DETAIL','FileTextOutlined',      3);

-- 전체 역할 메뉴 접근 허용
INSERT INTO role_menu (role_id, menu_id)
VALUES
('SYSTEM_ADMIN', 'MNU_PRODUCT'),    ('SCREEN_ADMIN', 'MNU_PRODUCT'),
('DEVELOPER',    'MNU_PRODUCT'),    ('USER',         'MNU_PRODUCT'),

('SYSTEM_ADMIN', 'MNU_PRODUCT_MD'), ('SCREEN_ADMIN', 'MNU_PRODUCT_MD'),
('DEVELOPER',    'MNU_PRODUCT_MD'), ('USER',         'MNU_PRODUCT_MD'),

('SYSTEM_ADMIN', 'MNU_PRODUCT_LST'),('SCREEN_ADMIN', 'MNU_PRODUCT_LST'),
('DEVELOPER',    'MNU_PRODUCT_LST'),('USER',         'MNU_PRODUCT_LST'),

('SYSTEM_ADMIN', 'MNU_PRODUCT_DTL'),('SCREEN_ADMIN', 'MNU_PRODUCT_DTL'),
('DEVELOPER',    'MNU_PRODUCT_DTL'),('USER',         'MNU_PRODUCT_DTL');
