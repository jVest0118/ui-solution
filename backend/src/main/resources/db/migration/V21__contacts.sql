-- V21: 연락처 기능

CREATE TABLE contact (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id      VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100),
    first_name    VARCHAR(100),
    nickname      VARCHAR(100),
    company       VARCHAR(200),
    department    VARCHAR(200),
    position      VARCHAR(100),
    emails        TEXT,
    phones        TEXT,
    cgroups       TEXT,
    is_favorite   TINYINT(1) NOT NULL DEFAULT 0,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_group (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id    VARCHAR(100) NOT NULL,
    group_name  VARCHAR(100) NOT NULL
);

CREATE UNIQUE INDEX uk_contact_group ON contact_group(owner_id, group_name);
CREATE INDEX idx_contact_owner ON contact(owner_id);
