-- V23: 연락처 샘플 데이터 (admin 계정 기준)

-- ── 그룹 ────────────────────────────────────────────────────
INSERT INTO contact_group (owner_id, group_name) VALUES
('admin', '동료'),
('admin', '클라이언트'),
('admin', '협력업체'),
('admin', '가족'),
('admin', '친구');

-- ── 연락처 (15명) ───────────────────────────────────────────

-- 1. 김민준 (동료)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '김', '민준', NULL, '야와소프트', 'SI사업부', '이사',
  '[{"type":"직장","email":"minjun.kim@yawasoft.com","isDefault":true},{"type":"개인","email":"minjun@gmail.com","isDefault":false}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01012340001","isDefault":true},{"type":"직장","countryCode":"+82","phone":"0212340001","isDefault":false}]',
  '["동료"]', TRUE);

-- 2. 이서연 (동료)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '이', '서연', NULL, '야와소프트', '개발팀', '팀장',
  '[{"type":"직장","email":"seoyeon.lee@yawasoft.com","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01023450002","isDefault":true}]',
  '["동료"]', FALSE);

-- 3. 박준혁 (동료)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '박', '준혁', '형', '야와소프트', '개발팀', '선임개발자',
  '[{"type":"직장","email":"junhyeok.park@yawasoft.com","isDefault":true},{"type":"개인","email":"parkjh@naver.com","isDefault":false}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01034560003","isDefault":true}]',
  '["동료","친구"]', FALSE);

-- 4. 최지우 (동료)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '최', '지우', NULL, '야와소프트', '기획팀', '과장',
  '[{"type":"직장","email":"jiwoo.choi@yawasoft.com","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01045670004","isDefault":true}]',
  '["동료"]', FALSE);

-- 5. 정하은 (동료)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '정', '하은', NULL, '야와소프트', 'QA팀', '주임',
  '[{"type":"직장","email":"haeun.jung@yawasoft.com","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01056780005","isDefault":true}]',
  '["동료"]', FALSE);

-- 6. 강도현 (클라이언트)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '강', '도현', NULL, '삼성SDS', '디지털플랫폼사업부', '수석',
  '[{"type":"직장","email":"dohyeon.kang@samsung.com","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01067890006","isDefault":true},{"type":"직장","countryCode":"+82","phone":"0226740006","isDefault":false}]',
  '["클라이언트"]', TRUE);

-- 7. 윤수아 (클라이언트)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '윤', '수아', NULL, 'LG CNS', 'IT서비스사업본부', '책임',
  '[{"type":"직장","email":"sua.yoon@lgcns.com","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01078900007","isDefault":true}]',
  '["클라이언트"]', FALSE);

-- 8. 임재원 (클라이언트)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '임', '재원', NULL, 'SK텔레콤', 'ICT기술원', '부장',
  '[{"type":"직장","email":"jaewon.im@skt.com","isDefault":true},{"type":"개인","email":"jaewon73@kakao.com","isDefault":false}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01089010008","isDefault":true}]',
  '["클라이언트"]', FALSE);

-- 9. 한소희 (클라이언트)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '한', '소희', NULL, 'KT', '디지털혁신본부', '과장',
  '[{"type":"직장","email":"sohee.han@kt.com","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01090120009","isDefault":true}]',
  '["클라이언트"]', FALSE);

-- 10. 오민석 (협력업체)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '오', '민석', NULL, '넥스트소프트', '솔루션개발팀', '이사',
  '[{"type":"직장","email":"minseok.oh@nextsoft.co.kr","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01001230010","isDefault":true},{"type":"직장","countryCode":"+82","phone":"0232100010","isDefault":false}]',
  '["협력업체"]', FALSE);

-- 11. 서지현 (협력업체)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '서', '지현', NULL, '클라우드넷', '기술지원팀', '팀장',
  '[{"type":"직장","email":"jihyeon.seo@cloudnet.kr","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01011230011","isDefault":true}]',
  '["협력업체"]', FALSE);

-- 12. 곽귀종 (친구)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '곽', '귀종', '효동', '야와소프트', 'SI사업부', '부장',
  '[{"type":"개인","email":"devk73@daum.net","isDefault":true},{"type":"직장","email":"devk770319@gmail.com","isDefault":false}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01049552714","isDefault":true}]',
  '["동료","친구"]', TRUE);

-- 13. 신예린 (친구)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '신', '예린', NULL, '카카오', '프로덕트팀', '프로',
  '[{"type":"개인","email":"yerin.shin@kakao.com","isDefault":true}]',
  '[{"type":"휴대폰","countryCode":"+82","phone":"01022230013","isDefault":true}]',
  '["친구"]', FALSE);

-- 14. 김아버지 (가족)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '김', '아버지', '아버지', NULL, NULL, NULL,
  '[]',
  '[{"type":"집","countryCode":"+82","phone":"01033330014","isDefault":true}]',
  '["가족"]', TRUE);

-- 15. 김어머니 (가족)
INSERT INTO contact (owner_id, last_name, first_name, nickname, company, department, position,
  emails, phones, cgroups, is_favorite)
VALUES ('admin', '김', '어머니', '어머니', NULL, NULL, NULL,
  '[]',
  '[{"type":"집","countryCode":"+82","phone":"01044440015","isDefault":true}]',
  '["가족"]', TRUE);
