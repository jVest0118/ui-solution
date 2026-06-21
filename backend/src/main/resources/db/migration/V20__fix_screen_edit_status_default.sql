-- V20: git push 이력 없는 화면은 COMMITTED → DONE 으로 초기화
-- (last_editor가 없다 = 아직 한 번도 git 추적이 안 된 화면)
UPDATE screen_def
SET edit_status = 'DONE'
WHERE edit_status = 'COMMITTED'
  AND last_editor IS NULL;
