-- V24: 연락처 목록 화면 (플랫폼 화면 설계 기능 데모)
-- 목적: 플랫폼 내장 화면 설계 도구(master-detail + field_def + biz_data)로
--       연락처 목록/등록/상세 화면을 구성할 수 있음을 보여주는 예제

-- ── 화면 정의 ────────────────────────────────────────────────
INSERT INTO screen_def (
  screen_id, screen_nm, screen_type, description, project_id,
  use_yn, version, open_type, edit_status, last_editor,
  layout_config, button_config
) VALUES (
  'DEMO_CONTACT',
  '연락처 목록',
  'master-detail',
  '플랫폼 화면 설계 기능(master-detail)으로 구성한 연락처 화면 예제. 목록 클릭 시 하단에 상세/수정 폼이 표시됩니다.',
  'DEMO',
  'Y', 1, 'page', 'COMMITTED', NULL,
  '{"formCols": 2, "useAgGrid": false}',
  '{"align": "right", "buttons": [{"action":"submit","label":"저장"},{"action":"reset","label":"취소","visible":true}]}'
);

-- ── 필드 정의 ────────────────────────────────────────────────
-- 그리드 컬럼: 성, 이름, 이메일, 전화번호, 회사, 부서, 직위, 그룹
-- 폼(상세/수정): 2컬럼 레이아웃

INSERT INTO field_def (screen_id, field_nm, field_label, field_type,
  sort_order, col_span, row_span, row_pos, col_pos,
  readonly_yn, hidden_yn, use_yn, placeholder)
VALUES
-- 행 0: 이름
('DEMO_CONTACT', 'lastName',   '성',       'text',     0, 1, 1, 0, 0, 'N', 'N', 'Y', '성'),
('DEMO_CONTACT', 'firstName',  '이름',     'text',     1, 1, 1, 0, 1, 'N', 'N', 'Y', '이름'),
-- 행 1: 연락처
('DEMO_CONTACT', 'email',      '이메일',   'text',     2, 1, 1, 1, 0, 'N', 'N', 'Y', '이메일 주소'),
('DEMO_CONTACT', 'phone',      '전화번호', 'text',     3, 1, 1, 1, 1, 'N', 'N', 'Y', '예) 010-1234-5678'),
-- 행 2: 직장 정보
('DEMO_CONTACT', 'company',    '회사',     'text',     4, 1, 1, 2, 0, 'N', 'N', 'Y', '회사명'),
('DEMO_CONTACT', 'department', '부서',     'text',     5, 1, 1, 2, 1, 'N', 'N', 'Y', '부서'),
-- 행 3: 직위 + 그룹
('DEMO_CONTACT', 'position',   '직위',     'text',     6, 1, 1, 3, 0, 'N', 'N', 'Y', '직위 / 직급'),
('DEMO_CONTACT', 'groupNm',    '그룹',     'text',     7, 1, 1, 3, 1, 'N', 'N', 'Y', '그룹 이름 (예: 동료, 가족)'),
-- 행 4: 메모 (전폭)
('DEMO_CONTACT', 'memo',       '메모',     'textarea', 8, 2, 1, 4, 0, 'N', 'N', 'Y', '메모를 입력하세요...');

-- ── 권한 설정 ────────────────────────────────────────────────
INSERT INTO role_screen (role_id, screen_id, can_read, can_create, can_update, can_delete)
VALUES
('SYSTEM_ADMIN', 'DEMO_CONTACT', 'Y', 'Y', 'Y', 'Y'),
('SCREEN_ADMIN', 'DEMO_CONTACT', 'Y', 'Y', 'Y', 'Y'),
('DEVELOPER',    'DEMO_CONTACT', 'Y', 'Y', 'Y', 'Y'),
('USER',         'DEMO_CONTACT', 'Y', 'N', 'N', 'N');

-- ── 샘플 데이터 (biz_data) ───────────────────────────────────
INSERT INTO biz_data (screen_id, project_id, data_json, status_cd, created_by) VALUES
('DEMO_CONTACT', 'DEMO', '{"lastName":"김","firstName":"민준","email":"minjun.kim@yawasoft.com","phone":"010-1234-0001","company":"야와소프트","department":"SI사업부","position":"이사","groupNm":"동료","memo":""}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"이","firstName":"서연","email":"seoyeon.lee@yawasoft.com","phone":"010-2345-0002","company":"야와소프트","department":"개발팀","position":"팀장","groupNm":"동료","memo":""}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"박","firstName":"준혁","email":"junhyeok.park@yawasoft.com","phone":"010-3456-0003","company":"야와소프트","department":"개발팀","position":"선임개발자","groupNm":"동료","memo":""}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"강","firstName":"도현","email":"dohyeon.kang@samsung.com","phone":"010-6789-0006","company":"삼성SDS","department":"디지털플랫폼사업부","position":"수석","groupNm":"클라이언트","memo":""}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"윤","firstName":"수아","email":"sua.yoon@lgcns.com","phone":"010-7890-0007","company":"LG CNS","department":"IT서비스사업본부","position":"책임","groupNm":"클라이언트","memo":""}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"임","firstName":"재원","email":"jaewon.im@skt.com","phone":"010-8901-0008","company":"SK텔레콤","department":"ICT기술원","position":"부장","groupNm":"클라이언트","memo":""}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"오","firstName":"민석","email":"minseok.oh@nextsoft.co.kr","phone":"010-0123-0010","company":"넥스트소프트","department":"솔루션개발팀","position":"이사","groupNm":"협력업체","memo":""}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"곽","firstName":"귀종","email":"devk73@daum.net","phone":"010-4955-2714","company":"야와소프트","department":"SI사업부","position":"부장","groupNm":"동료","memo":"효동"}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"최","firstName":"지우","email":"jiwoo.choi@yawasoft.com","phone":"010-4567-0004","company":"야와소프트","department":"기획팀","position":"과장","groupNm":"동료","memo":""}', 'ACTIVE', 'admin'),
('DEMO_CONTACT', 'DEMO', '{"lastName":"정","firstName":"하은","email":"haeun.jung@yawasoft.com","phone":"010-5678-0005","company":"야와소프트","department":"QA팀","position":"주임","groupNm":"동료","memo":""}', 'ACTIVE', 'admin');
