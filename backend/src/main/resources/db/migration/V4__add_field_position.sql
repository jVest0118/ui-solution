-- 필드 2D 그리드 위치 컬럼 추가
ALTER TABLE field_def ADD COLUMN row_pos INT NOT NULL DEFAULT 0;
ALTER TABLE field_def ADD COLUMN col_pos INT NOT NULL DEFAULT 0;

-- 기존 데이터 마이그레이션: sort_order를 row_pos로 (각 필드를 별도 행 0열에 배치)
UPDATE field_def SET row_pos = sort_order, col_pos = 0;
