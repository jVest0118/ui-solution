-- V27: 실제 테이블 매핑 기능 추가
-- screen_def: 데이터 소스 유형 및 테이블 매핑 정보
ALTER TABLE screen_def ADD COLUMN datasource_type VARCHAR(20) DEFAULT 'biz_data';
ALTER TABLE screen_def ADD COLUMN table_nm        VARCHAR(200);
ALTER TABLE screen_def ADD COLUMN pk_column       VARCHAR(100) DEFAULT 'id';
ALTER TABLE screen_def ADD COLUMN db_conn_id      VARCHAR(50);

-- field_def: 실제 DB 컬럼명 매핑
ALTER TABLE field_def ADD COLUMN column_nm VARCHAR(100);
