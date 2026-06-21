-- V26: 캔버스 방식 연락처 화면 등록
-- CONTACT_CANVAS: 목록(그리드) 화면 - 캔버스 타입으로 자유 설계 가능
-- CONTACT_FORM  : 등록/수정 팝업 폼 화면

-- ── 1. 등록/수정 팝업 폼 화면 ────────────────────────────────
INSERT INTO screen_def (
  screen_id, screen_nm, screen_type, description, project_id,
  use_yn, version, open_type, edit_status, last_editor
) VALUES (
  'CONTACT_FORM', '연락처 등록/수정', 'form',
  '연락처 등록 및 수정용 팝업 폼 화면 (CONTACT_CANVAS 그리드에서 열림)',
  'DEMO', 'Y', 1, 'popup', 'COMMITTED', NULL
);

INSERT INTO field_def (screen_id, field_nm, field_label, field_type,
  sort_order, col_span, row_span, row_pos, col_pos,
  readonly_yn, hidden_yn, use_yn, placeholder)
VALUES
('CONTACT_FORM', 'lastName',   '성',       'text',     0, 1, 1, 0, 0, 'N', 'N', 'Y', '성'),
('CONTACT_FORM', 'firstName',  '이름',     'text',     1, 1, 1, 0, 1, 'N', 'N', 'Y', '이름'),
('CONTACT_FORM', 'email',      '이메일',   'text',     2, 1, 1, 1, 0, 'N', 'N', 'Y', '이메일 주소'),
('CONTACT_FORM', 'phone',      '전화번호', 'text',     3, 1, 1, 1, 1, 'N', 'N', 'Y', '예) 010-1234-5678'),
('CONTACT_FORM', 'company',    '회사',     'text',     4, 1, 1, 2, 0, 'N', 'N', 'Y', '회사명'),
('CONTACT_FORM', 'department', '부서',     'text',     5, 1, 1, 2, 1, 'N', 'N', 'Y', '부서'),
('CONTACT_FORM', 'position',   '직위',     'text',     6, 1, 1, 3, 0, 'N', 'N', 'Y', '직위 / 직급'),
('CONTACT_FORM', 'groupNm',    '그룹',     'text',     7, 1, 1, 3, 1, 'N', 'N', 'Y', '예) 동료, 가족'),
('CONTACT_FORM', 'memo',       '메모',     'textarea', 8, 2, 1, 4, 0, 'N', 'N', 'Y', '메모를 입력하세요...');

-- 폼 레이아웃: 2컬럼, 저장/취소 버튼
UPDATE screen_def SET
  layout_config = '{"formCols":2}',
  button_config = '{"align":"right","buttons":[{"action":"submit","label":"저장","visible":true},{"action":"reset","label":"취소","visible":true}]}'
WHERE screen_id = 'CONTACT_FORM';

-- ── 2. 캔버스 목록 화면 ──────────────────────────────────────
INSERT INTO screen_def (
  screen_id, screen_nm, screen_type, description, project_id,
  use_yn, version, open_type, edit_status, last_editor,
  layout_config
) VALUES (
  'CONTACT_CANVAS', '연락처 목록 (캔버스)', 'canvas',
  '캔버스 방식으로 자유 설계한 연락처 목록 화면. 데이터 그리드 컴포넌트로 구성.',
  'DEMO', 'Y', 1, 'page', 'COMMITTED', NULL,
  '{"canvasWidth":1160,"canvasHeight":680,"backgroundColor":"#f5f7fa","elements":[{"id":"title_1","type":"heading","x":24,"y":20,"w":400,"h":40,"props":{"text":"연락처 목록","fontSize":22,"fontWeight":"bold","color":"#1a1a1a","textAlign":"left"}},{"id":"grid_1","type":"data-grid","x":24,"y":74,"w":1112,"h":580,"props":{"apiEndpoint":"/biz/DEMO_CONTACT","columns":[{"field":"lastName","header":"성","width":60},{"field":"firstName","header":"이름","width":80},{"field":"email","header":"이메일","width":200},{"field":"phone","header":"전화번호","width":140},{"field":"company","header":"회사","width":150},{"field":"department","header":"부서","width":120},{"field":"position","header":"직위","width":100},{"field":"groupNm","header":"그룹","width":100}],"toolbarButtons":[{"label":"등록","buttonType":"primary","action":"open-popup","targetScreenId":"CONTACT_FORM"}],"rowClickAction":"open-popup","rowClickTargetScreenId":"CONTACT_FORM","searchFields":["lastName","firstName","email"],"gridHeight":540,"pageSize":20}}]}'
);

-- ── 3. 권한 설정 ─────────────────────────────────────────────
INSERT INTO role_screen (role_id, screen_id, can_read, can_create, can_update, can_delete)
VALUES
('SYSTEM_ADMIN', 'CONTACT_FORM',   'Y','Y','Y','Y'),
('SCREEN_ADMIN', 'CONTACT_FORM',   'Y','Y','Y','Y'),
('DEVELOPER',    'CONTACT_FORM',   'Y','Y','Y','Y'),
('USER',         'CONTACT_FORM',   'Y','N','N','N'),
('SYSTEM_ADMIN', 'CONTACT_CANVAS', 'Y','Y','Y','Y'),
('SCREEN_ADMIN', 'CONTACT_CANVAS', 'Y','Y','Y','Y'),
('DEVELOPER',    'CONTACT_CANVAS', 'Y','Y','Y','Y'),
('USER',         'CONTACT_CANVAS', 'Y','N','N','N');
