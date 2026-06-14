-- ============================================================
-- UI Solution Platform - 초기 스키마
-- Version: 1.0
-- Description: 사용자/권한/메뉴/화면스키마 기반 테이블
-- ============================================================

-- ============================================================
-- 1. 사용자 & 권한 영역
-- ============================================================

CREATE TABLE IF NOT EXISTS usr_info (
    user_id       VARCHAR(50)  NOT NULL,
    user_nm       VARCHAR(100) NOT NULL,
    password      VARCHAR(255) NOT NULL,         -- BCrypt 해시
    email         VARCHAR(200),
    dept_nm       VARCHAR(100),
    use_yn        CHAR(1)      NOT NULL DEFAULT 'Y',
    pwd_chg_dt    DATE,
    last_login_dt TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_usr_info PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS role_def (
    role_id       VARCHAR(50)  NOT NULL,
    role_nm       VARCHAR(100) NOT NULL,
    role_desc     VARCHAR(500),
    role_level    INT          NOT NULL DEFAULT 10,  -- 숫자 낮을수록 상위 권한
    use_yn        CHAR(1)      NOT NULL DEFAULT 'Y',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_role_def PRIMARY KEY (role_id)
);

CREATE TABLE IF NOT EXISTS usr_role (
    user_id       VARCHAR(50)  NOT NULL,
    role_id       VARCHAR(50)  NOT NULL,
    granted_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by    VARCHAR(50),
    CONSTRAINT pk_usr_role PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_usr_role_user FOREIGN KEY (user_id) REFERENCES usr_info(user_id),
    CONSTRAINT fk_usr_role_role FOREIGN KEY (role_id) REFERENCES role_def(role_id)
);

-- ============================================================
-- 2. 메뉴 영역
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_def (
    menu_id       VARCHAR(50)  NOT NULL,
    parent_id     VARCHAR(50),                      -- 상위 메뉴 (NULL = 최상위)
    menu_nm       VARCHAR(100) NOT NULL,
    menu_url      VARCHAR(500),                     -- 화면 URL or screen_id
    menu_icon     VARCHAR(100),
    sort_order    INT          NOT NULL DEFAULT 0,
    use_yn        CHAR(1)      NOT NULL DEFAULT 'Y',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_menu_def PRIMARY KEY (menu_id),
    CONSTRAINT fk_menu_parent FOREIGN KEY (parent_id) REFERENCES menu_def(menu_id)
);

CREATE TABLE IF NOT EXISTS role_menu (
    role_id       VARCHAR(50)  NOT NULL,
    menu_id       VARCHAR(50)  NOT NULL,
    CONSTRAINT pk_role_menu PRIMARY KEY (role_id, menu_id),
    CONSTRAINT fk_role_menu_role FOREIGN KEY (role_id) REFERENCES role_def(role_id),
    CONSTRAINT fk_role_menu_menu FOREIGN KEY (menu_id) REFERENCES menu_def(menu_id)
);

-- ============================================================
-- 3. 화면 스키마 영역
-- ============================================================

CREATE TABLE IF NOT EXISTS screen_def (
    screen_id       VARCHAR(50)   NOT NULL,
    screen_nm       VARCHAR(200)  NOT NULL,
    screen_type     VARCHAR(30)   NOT NULL,          -- form / grid / master-detail / popup
    description     VARCHAR(1000),
    api_resource    VARCHAR(200),                    -- REST resource 경로 (자동 CRUD)
    layout_config   TEXT,                            -- JSON: 전체 레이아웃 설정
    button_config   TEXT,                            -- JSON: 버튼 목록 및 이벤트
    version         INT           NOT NULL DEFAULT 1,
    use_yn          CHAR(1)       NOT NULL DEFAULT 'Y',
    created_by      VARCHAR(50),
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_screen_def PRIMARY KEY (screen_id)
);

CREATE TABLE IF NOT EXISTS field_def (
    field_id        BIGINT        NOT NULL,          -- AUTO_INCREMENT
    screen_id       VARCHAR(50)   NOT NULL,
    field_nm        VARCHAR(100)  NOT NULL,          -- 실제 필드명 (API 파라미터명)
    field_label     VARCHAR(200)  NOT NULL,          -- 화면 라벨
    field_type      VARCHAR(30)   NOT NULL,          -- text/number/date/datetime/select/radio/checkbox/textarea/file/grid/popup
    input_type      VARCHAR(30),                     -- text/password/email/tel (field_type=text 일때 세부)
    placeholder     VARCHAR(200),
    default_value   VARCHAR(500),
    col_span        INT           NOT NULL DEFAULT 1, -- 그리드 컬럼 점유 (1~12)
    row_span        INT           NOT NULL DEFAULT 1,
    sort_order      INT           NOT NULL DEFAULT 0,
    readonly_yn     CHAR(1)       NOT NULL DEFAULT 'N',
    hidden_yn       CHAR(1)       NOT NULL DEFAULT 'N',
    code_group      VARCHAR(50),                     -- field_type=select 일때 공통코드 그룹
    popup_screen_id VARCHAR(50),                     -- field_type=popup 일때 연결 화면
    extra_config    TEXT,                            -- JSON: 기타 컴포넌트별 설정
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_field_def PRIMARY KEY (field_id),
    CONSTRAINT fk_field_screen FOREIGN KEY (screen_id) REFERENCES screen_def(screen_id)
);

CREATE TABLE IF NOT EXISTS validation_rule (
    rule_id         BIGINT        NOT NULL,          -- AUTO_INCREMENT
    field_id        BIGINT        NOT NULL,
    rule_type       VARCHAR(30)   NOT NULL,          -- required/minLength/maxLength/min/max/regex/custom
    rule_value      VARCHAR(500),                    -- 검증값 (정규식, 숫자 등)
    error_msg       VARCHAR(500)  NOT NULL,          -- 사용자 표시 오류 메시지
    condition_json  TEXT,                            -- 조건부 검증 (다른 필드값에 따라)
    sort_order      INT           NOT NULL DEFAULT 0,
    CONSTRAINT pk_validation_rule PRIMARY KEY (rule_id),
    CONSTRAINT fk_val_field FOREIGN KEY (field_id) REFERENCES field_def(field_id)
);

-- ============================================================
-- 4. 화면별 권한 영역
-- ============================================================

CREATE TABLE IF NOT EXISTS role_screen (
    role_id         VARCHAR(50)   NOT NULL,
    screen_id       VARCHAR(50)   NOT NULL,
    can_read        CHAR(1)       NOT NULL DEFAULT 'Y',  -- 조회
    can_create      CHAR(1)       NOT NULL DEFAULT 'N',  -- 등록
    can_update      CHAR(1)       NOT NULL DEFAULT 'N',  -- 수정
    can_delete      CHAR(1)       NOT NULL DEFAULT 'N',  -- 삭제
    can_excel       CHAR(1)       NOT NULL DEFAULT 'N',  -- 엑셀
    can_print       CHAR(1)       NOT NULL DEFAULT 'N',  -- 출력
    CONSTRAINT pk_role_screen PRIMARY KEY (role_id, screen_id),
    CONSTRAINT fk_rs_role FOREIGN KEY (role_id) REFERENCES role_def(role_id),
    CONSTRAINT fk_rs_screen FOREIGN KEY (screen_id) REFERENCES screen_def(screen_id)
);

-- ============================================================
-- 5. 공통코드 영역
-- ============================================================

CREATE TABLE IF NOT EXISTS code_group (
    group_cd        VARCHAR(50)   NOT NULL,
    group_nm        VARCHAR(200)  NOT NULL,
    description     VARCHAR(500),
    use_yn          CHAR(1)       NOT NULL DEFAULT 'Y',
    CONSTRAINT pk_code_group PRIMARY KEY (group_cd)
);

CREATE TABLE IF NOT EXISTS code_detail (
    group_cd        VARCHAR(50)   NOT NULL,
    code_val        VARCHAR(100)  NOT NULL,
    code_nm         VARCHAR(200)  NOT NULL,
    sort_order      INT           NOT NULL DEFAULT 0,
    extra1          VARCHAR(200),                    -- 확장 속성 1
    extra2          VARCHAR(200),                    -- 확장 속성 2
    use_yn          CHAR(1)       NOT NULL DEFAULT 'Y',
    CONSTRAINT pk_code_detail PRIMARY KEY (group_cd, code_val),
    CONSTRAINT fk_code_group FOREIGN KEY (group_cd) REFERENCES code_group(group_cd)
);

-- ============================================================
-- 6. 컴포넌트 템플릿 영역
-- ============================================================

CREATE TABLE IF NOT EXISTS component_template (
    template_id     VARCHAR(50)   NOT NULL,
    template_nm     VARCHAR(200)  NOT NULL,
    template_type   VARCHAR(50)   NOT NULL,          -- form/grid/master-detail/popup/dashboard
    description     VARCHAR(1000),
    default_config  TEXT          NOT NULL,          -- JSON: 기본 스키마 구조
    thumbnail_url   VARCHAR(500),
    use_yn          CHAR(1)       NOT NULL DEFAULT 'Y',
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_component_template PRIMARY KEY (template_id)
);

-- ============================================================
-- 7. 시스템 로그
-- ============================================================

CREATE TABLE IF NOT EXISTS sys_access_log (
    log_id          BIGINT        NOT NULL,
    user_id         VARCHAR(50),
    screen_id       VARCHAR(50),
    action_type     VARCHAR(30),                     -- LOGIN/READ/CREATE/UPDATE/DELETE
    ip_address      VARCHAR(50),
    user_agent      VARCHAR(500),
    request_url     VARCHAR(500),
    result_code     VARCHAR(10),
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sys_access_log PRIMARY KEY (log_id)
);

-- ============================================================
-- 기본 데이터 INSERT
-- ============================================================

-- 기본 롤
INSERT INTO role_def (role_id, role_nm, role_desc, role_level) VALUES
('SYSTEM_ADMIN', '시스템관리자', '플랫폼 전체 관리 권한', 1),
('SCREEN_ADMIN', '화면관리자',   '화면 스키마 등록/수정 권한', 2),
('DEVELOPER',    '개발자',       'API 연결 및 개발 관련 권한', 3),
('USER',         '일반사용자',   '업무 화면 사용 권한', 10);

-- 기본 관리자 계정 (비밀번호: Admin1234! -> BCrypt)
INSERT INTO usr_info (user_id, user_nm, password, email) VALUES
('admin', '시스템관리자', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin@company.com');

INSERT INTO usr_role (user_id, role_id, granted_by) VALUES
('admin', 'SYSTEM_ADMIN', 'system');

-- 기본 메뉴
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order) VALUES
('MNU001', NULL,     '시스템관리',    NULL,                  'SettingOutlined',    1),
('MNU001_01', 'MNU001', '사용자관리',  '/admin/users',        'UserOutlined',       1),
('MNU001_02', 'MNU001', '롤관리',     '/admin/roles',        'TeamOutlined',       2),
('MNU001_03', 'MNU001', '메뉴관리',   '/admin/menus',        'MenuOutlined',       3),
('MNU002', NULL,     '화면설계',      NULL,                  'AppstoreOutlined',   2),
('MNU002_01', 'MNU002', '화면목록',   '/admin/screens',      'LayoutOutlined',     1),
('MNU002_02', 'MNU002', '화면등록',   '/admin/screens/new',  'PlusOutlined',       2),
('MNU002_03', 'MNU002', '공통코드',   '/admin/codes',        'TagOutlined',        3),
('MNU003', NULL,     '업무화면',      NULL,                  'DatabaseOutlined',   3);

-- 시스템관리자 메뉴 권한 (전체)
INSERT INTO role_menu (role_id, menu_id)
SELECT 'SYSTEM_ADMIN', menu_id FROM menu_def;

-- 공통코드 기본값
INSERT INTO code_group (group_cd, group_nm) VALUES
('FIELD_TYPE',   '필드타입'),
('SCREEN_TYPE',  '화면타입'),
('VALID_TYPE',   '검증타입'),
('USE_YN',       '사용여부');

INSERT INTO code_detail (group_cd, code_val, code_nm, sort_order) VALUES
('FIELD_TYPE', 'text',      '텍스트',        1),
('FIELD_TYPE', 'number',    '숫자',          2),
('FIELD_TYPE', 'date',      '날짜',          3),
('FIELD_TYPE', 'datetime',  '날짜시간',      4),
('FIELD_TYPE', 'select',    '선택(드롭다운)', 5),
('FIELD_TYPE', 'radio',     '라디오버튼',    6),
('FIELD_TYPE', 'checkbox',  '체크박스',      7),
('FIELD_TYPE', 'textarea',  '텍스트영역',    8),
('FIELD_TYPE', 'file',      '파일첨부',      9),
('FIELD_TYPE', 'popup',     '팝업검색',      10),
('SCREEN_TYPE', 'form',          '입력폼',          1),
('SCREEN_TYPE', 'grid',          '그리드조회',      2),
('SCREEN_TYPE', 'master-detail', '마스터-디테일',   3),
('SCREEN_TYPE', 'popup',         '팝업',            4),
('VALID_TYPE', 'required',   '필수입력',    1),
('VALID_TYPE', 'minLength',  '최소길이',    2),
('VALID_TYPE', 'maxLength',  '최대길이',    3),
('VALID_TYPE', 'min',        '최솟값',      4),
('VALID_TYPE', 'max',        '최댓값',      5),
('VALID_TYPE', 'regex',      '정규식',      6),
('VALID_TYPE', 'email',      '이메일형식',  7),
('VALID_TYPE', 'number',     '숫자만',      8),
('USE_YN', 'Y', '사용', 1),
('USE_YN', 'N', '미사용', 2);

-- 기본 컴포넌트 템플릿
INSERT INTO component_template (template_id, template_nm, template_type, description, default_config) VALUES
('TPL_FORM_BASIC', '기본 입력폼', 'form',
 '검색조건 + 입력폼 기본 템플릿',
 '{"columns":2,"hasSearch":false,"buttons":["save","reset"]}'),
('TPL_GRID_BASIC', '기본 그리드', 'grid',
 '검색조건 + 그리드 목록 기본 템플릿',
 '{"columns":1,"hasSearch":true,"buttons":["search","excel"]}'),
('TPL_MASTER_DETAIL', '마스터-디테일', 'master-detail',
 '상단 그리드 + 하단 입력폼 구조',
 '{"masterType":"grid","detailType":"form","buttons":["search","save","delete"]}'),
('TPL_POPUP_SEARCH', '팝업 검색창', 'popup',
 '조회 후 선택하는 팝업 템플릿',
 '{"columns":1,"hasSearch":true,"buttons":["search","select"]}');
