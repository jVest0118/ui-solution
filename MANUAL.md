# UI Solution Platform - 1단계 개발 메뉴얼

## 개요

UI Solution Platform은 **"화면 = 데이터"** 철학 기반의 스키마 구동형 업무 화면 개발 플랫폼입니다.
DB에 화면 스키마를 등록하면 빌드 없이 즉시 업무 화면이 생성됩니다.

---

## 전체 아키텍처

```
[관리자 / 개발자]
    브라우저 → React Admin UI (화면 스키마 등록)
                        ↓ JSON 저장
              [DB: screen_def / field_def / validation_rule]
                        ↑ 스키마 조회
    브라우저 → React Runtime Renderer → 업무 화면 즉시 표시
                        ↑↓ 데이터 CRUD
              [Spring Boot API Server]
```

---

## 프로젝트 구조

```
ui-solution/
├── database/
│   └── V1__init_schema.sql         # 전체 테이블 DDL + 기본 데이터
├── backend/                        # Spring Boot 3.2 / Java 17
│   ├── pom.xml
│   └── src/main/java/com/uisolution/platform/
│       ├── PlatformApplication.java
│       ├── auth/                   # 로그인, JWT 발급
│       ├── schema/                 # 화면 스키마 CRUD API (핵심)
│       ├── admin/                  # 사용자, 롤, 메뉴 관리
│       ├── security/               # JWT 필터, 토큰 프로바이더
│       └── config/                 # Security, CORS, 예외처리
└── frontend/                       # React 18 + Vite + TypeScript
    └── src/
        ├── types/                  # schema.ts, auth.ts (타입 정의)
        ├── api/                    # axios, auth.ts, schema.ts
        ├── store/                  # authStore (Zustand, JWT/롤/메뉴 저장)
        ├── components/
        │   ├── fields/             # FieldRenderer (타입별 컴포넌트 자동 선택)
        │   ├── renderer/           # ScreenRenderer, ValidationRunner (핵심 엔진)
        │   └── layout/             # AppLayout (사이드바+헤더)
        └── pages/
            ├── auth/               # LoginPage
            └── admin/              # ScreenListPage
```

---

## 환경 설정

### 사전 요구사항

| 항목 | 버전 |
|------|------|
| Java | 17 이상 |
| Maven | 3.8 이상 |
| Node.js | 18 이상 |
| PostgreSQL | 14 이상 |

### DB 생성

```sql
CREATE DATABASE uisolution;
CREATE USER uisolution WITH PASSWORD 'uisolution123';
GRANT ALL PRIVILEGES ON DATABASE uisolution TO uisolution;
```

> `backend/src/main/resources/application.yml` 에서 DB 접속 정보 변경 가능

---

## 실행 방법

### 백엔드

```bash
cd backend
mvn spring-boot:run
```

- 서버 기동 시 Flyway가 `V1__init_schema.sql` 자동 실행 (테이블 생성 + 기본 데이터)
- API 서버: `http://localhost:8080/api`

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

- 개발 서버: `http://localhost:3000`
- `/api` 요청은 `localhost:8080` 으로 자동 프록시

---

## 기본 계정

| 아이디 | 비밀번호 | 롤 |
|--------|---------|-----|
| admin | Admin1234! | SYSTEM_ADMIN |

---

## DB 스키마 설명

### 핵심 테이블

#### `screen_def` - 화면 정의
| 컬럼 | 설명 |
|------|------|
| screen_id | 화면 고유 ID (예: EMP001) |
| screen_nm | 화면명 |
| screen_type | form / grid / master-detail / popup |
| api_resource | REST 리소스 경로 (자동 CRUD 연결) |
| layout_config | 레이아웃 설정 JSON (columns 등) |
| button_config | 버튼 목록 JSON (save/reset/search 등) |

#### `field_def` - 필드 정의
| 컬럼 | 설명 |
|------|------|
| field_type | text/number/date/select/radio/checkbox/textarea/file/popup |
| col_span | 그리드 점유 칸 수 (1~12, columns=2이면 최대 2) |
| code_group | select/radio 타입 시 공통코드 그룹 코드 |
| popup_screen_id | popup 타입 시 연결할 팝업 화면 ID |

#### `validation_rule` - 검증 룰
| rule_type | ruleValue | 설명 |
|-----------|-----------|------|
| required | (없음) | 필수 입력 |
| minLength | 숫자 | 최소 글자 수 |
| maxLength | 숫자 | 최대 글자 수 |
| min / max | 숫자 | 숫자 범위 |
| regex | 정규식 문자열 | 정규식 검증 |
| email | (없음) | 이메일 형식 |
| number | (없음) | 숫자만 허용 |

---

## 화면 스키마 등록 예시

### SQL로 직접 등록 (임시)

```sql
-- 1. 화면 등록
INSERT INTO screen_def (screen_id, screen_nm, screen_type, api_resource, layout_config, button_config)
VALUES (
  'EMP001', '직원등록', 'form', 'employee',
  '{"columns": 2}',
  '["save","reset"]'
);

-- 2. 필드 등록
INSERT INTO field_def (field_id, screen_id, field_nm, field_label, field_type, sort_order, col_span)
VALUES
  (1, 'EMP001', 'emp_no',   '사원번호', 'text',   1, 1),
  (2, 'EMP001', 'emp_nm',   '성명',     'text',   2, 1),
  (3, 'EMP001', 'dept_code','부서',     'select', 3, 1),
  (4, 'EMP001', 'hire_date','입사일',   'date',   4, 1),
  (5, 'EMP001', 'email',    '이메일',   'text',   5, 2);

-- 3. 검증 룰 등록
INSERT INTO validation_rule (rule_id, field_id, rule_type, rule_value, error_msg)
VALUES
  (1, 1, 'required',  NULL,   '사원번호는 필수입니다.'),
  (2, 1, 'maxLength', '10',   '사원번호는 10자 이하입니다.'),
  (3, 2, 'required',  NULL,   '성명은 필수입니다.'),
  (4, 5, 'email',     NULL,   '이메일 형식이 올바르지 않습니다.');
```

### 등록 후 즉시 접속

브라우저에서 `http://localhost:3000/app/EMP001` 접속 → 빌드 없이 화면 표시

---

## API 명세

### 인증

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/auth/login` | 로그인, JWT 발급 |

**요청:**
```json
{ "userId": "admin", "password": "Admin1234!" }
```

**응답:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "userId": "admin",
    "userNm": "시스템관리자",
    "roles": ["SYSTEM_ADMIN"],
    "menus": [...]
  }
}
```

### 스키마 조회

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/schema/{screenId}` | 화면 스키마 + 권한 조회 |
| GET | `/api/schema` | 전체 화면 목록 |

> React 렌더러가 화면 진입 시 자동 호출. 개발자가 직접 호출할 필요 없음.

---

## 핵심 컴포넌트 설명

### ScreenRenderer
`src/components/renderer/ScreenRenderer.tsx`

- 화면 진입 시 `screenId`로 스키마 API 호출
- 스키마 기반으로 필드 자동 렌더링
- 저장 버튼 클릭 시 ValidationRunner로 검증 후 API 호출
- 5분간 스키마 캐싱 (불필요한 API 재호출 방지)

### FieldRenderer
`src/components/fields/FieldRenderer.tsx`

- `field_type`에 따라 자동으로 적절한 컴포넌트 선택
- 새로운 필드 타입 추가 시 이 파일에 case만 추가

### ValidationRunner
`src/components/renderer/ValidationRunner.ts`

- DB에 등록된 검증 룰을 런타임에 실행
- `conditionJson` 지원: 다른 필드 값에 따른 조건부 검증
- 백엔드 Java Validation Engine과 동일한 룰 적용

---

## 2단계 예정 기능

- [ ] 화면 스키마 등록 UI (테이블 형태로 필드 등록)
- [ ] 실시간 미리보기 (등록하면서 화면 확인)
- [ ] 그리드(Grid) 화면 타입 렌더러
- [ ] 마스터-디테일 화면 타입 렌더러
- [ ] Business API 자동 생성 (api_resource 기반 CRUD)
- [ ] 공통코드 관리 화면
- [ ] 사용자/롤 관리 화면
- [ ] 엑셀 Export
