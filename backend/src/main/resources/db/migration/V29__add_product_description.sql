-- V29: product 테이블에 description 컬럼 추가
-- 화면 필드 정의에 description 필드가 있으나 테이블에 컬럼이 없어 SELECT 오류 발생

ALTER TABLE product ADD COLUMN description TEXT AFTER product_nm;
