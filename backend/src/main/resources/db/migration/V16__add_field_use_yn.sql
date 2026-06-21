-- V16: field_def에 사용여부(use_yn) 컬럼 추가
ALTER TABLE field_def ADD COLUMN use_yn VARCHAR(1) NOT NULL DEFAULT 'Y';
