CREATE TABLE uploaded_file (
    file_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    original_nm  VARCHAR(255) NOT NULL,
    stored_path  VARCHAR(500) NOT NULL,
    file_size    BIGINT,
    content_type VARCHAR(100),
    screen_id    VARCHAR(100),
    field_nm     VARCHAR(100),
    created_by   VARCHAR(100),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
