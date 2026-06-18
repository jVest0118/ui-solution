-- V7: 파일 업로드 전역 설정

CREATE TABLE IF NOT EXISTS upload_settings (
    id            BIGINT       NOT NULL DEFAULT 1,
    base_path     VARCHAR(500) NOT NULL DEFAULT 'uploads',
    sub_dir_type  VARCHAR(20)  NOT NULL DEFAULT 'DATE',
    fixed_sub_dir VARCHAR(200),
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_by    VARCHAR(50),
    CONSTRAINT pk_upload_settings PRIMARY KEY (id)
);

-- 기본 행 삽입 (H2/PostgreSQL 공통 호환 문법)
INSERT INTO upload_settings (id, base_path, sub_dir_type, fixed_sub_dir)
VALUES (1, 'uploads', 'DATE', NULL);

-- System Mgmt 메뉴에 파일 업로드 설정 추가
INSERT INTO menu_def (menu_id, parent_id, menu_nm, menu_url, menu_icon, sort_order, project_id)
SELECT 'MNU001_05', 'MNU001', '파일 업로드 설정', '/admin/upload-settings', 'CloudUploadOutlined', 5, NULL
WHERE NOT EXISTS (SELECT 1 FROM menu_def WHERE menu_id = 'MNU001_05');

INSERT INTO role_menu (role_id, menu_id)
SELECT 'SYSTEM_ADMIN', 'MNU001_05'
WHERE NOT EXISTS (SELECT 1 FROM role_menu WHERE role_id = 'SYSTEM_ADMIN' AND menu_id = 'MNU001_05');
