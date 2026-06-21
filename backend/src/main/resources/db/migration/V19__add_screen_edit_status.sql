-- V19: 화면 협업 편집 상태 추적 컬럼 추가
-- edit_status: COMMITTED(연녹색/자유편집), DONE(연빨간/뷰전용), EDITING(빨간/잠금)

ALTER TABLE screen_def ADD COLUMN edit_status  VARCHAR(20)  NOT NULL DEFAULT 'COMMITTED';
ALTER TABLE screen_def ADD COLUMN last_editor  VARCHAR(100);
ALTER TABLE screen_def ADD COLUMN locked_by   VARCHAR(100);
ALTER TABLE screen_def ADD COLUMN locked_at   TIMESTAMP;
