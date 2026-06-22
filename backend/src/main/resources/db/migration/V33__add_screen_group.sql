-- V33: 화면 그룹(폴더) 기능 추가
ALTER TABLE screen_def ADD COLUMN screen_group VARCHAR(200) NULL COMMENT '화면 그룹(파일 탐색기 폴더)';
