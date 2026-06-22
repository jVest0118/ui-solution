-- V31: 페이지 컴포저 - 자유 배치 페이지 정의 테이블
-- 여러 화면(screen)을 테이블 레이아웃으로 조합하는 페이지 구성 기능

CREATE TABLE IF NOT EXISTS page_def (
    page_id       VARCHAR(50)   NOT NULL,
    page_nm       VARCHAR(200)  NOT NULL,
    description   VARCHAR(1000),
    layout_json   LONGTEXT,
    project_id    VARCHAR(50)   DEFAULT 'DEFAULT',
    use_yn        VARCHAR(1)    NOT NULL DEFAULT 'Y',
    created_by    VARCHAR(50),
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_page_def PRIMARY KEY (page_id)
);

-- 페이지 컴포저 관리 메뉴
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order)
VALUES ('MNU_PAGE_COMPOSER', NULL, '페이지 구성', '/admin/page-composer', 'LayoutOutlined', 25);

-- 전체 관리자 역할에 메뉴 접근 허용
INSERT INTO role_menu (role_id, menu_id) VALUES
('SYSTEM_ADMIN', 'MNU_PAGE_COMPOSER'),
('SCREEN_ADMIN', 'MNU_PAGE_COMPOSER'),
('DEVELOPER',    'MNU_PAGE_COMPOSER');
