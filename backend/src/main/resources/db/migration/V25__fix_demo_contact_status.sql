-- V25: DEMO_CONTACT 화면 상태를 COMMITTED으로 수정 (설계 가능 상태)
UPDATE screen_def
SET edit_status = 'COMMITTED', last_editor = NULL, locked_by = NULL, locked_at = NULL
WHERE screen_id = 'DEMO_CONTACT';
