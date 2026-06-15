-- 화면 열기 방식 구분: page(일반페이지) | tab(탭) | popup(팝업)
ALTER TABLE screen_def ADD COLUMN open_type VARCHAR(20) NOT NULL DEFAULT 'page';
