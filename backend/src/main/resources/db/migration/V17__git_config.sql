-- Git 설정 테이블
CREATE TABLE IF NOT EXISTS git_config (
    config_id       VARCHAR(50)  NOT NULL DEFAULT 'DEFAULT' PRIMARY KEY,
    repo_path       VARCHAR(500),                          -- 로컬 저장소 경로
    remote_url      VARCHAR(500),                          -- 원격 저장소 URL
    username        VARCHAR(100),                          -- Git 사용자명
    access_token    VARCHAR(1000),                         -- Personal Access Token
    branch          VARCHAR(100) NOT NULL DEFAULT 'main',  -- 기본 브랜치
    auto_restart    VARCHAR(1)   NOT NULL DEFAULT 'N',     -- pull 후 자동 재시작 여부
    restart_command VARCHAR(1000),                         -- 재시작 명령어
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
