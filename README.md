# Jusigi

Discord 경제 게임 봇. 기존 `feature/casino`의 명령과 두 퀴즈를 유지하며 [Notion Jusigi.js](https://app.notion.com/p/1b04c08deadf80568df3f95b7ead2857)의 활성 규칙을 공통 도메인으로 구현한다.

## 실행

Node.js 22.12 이상(권장 24), MySQL 8.0.16 이상, Redis TLS endpoint가 필요하다.

```sh
npm ci
cp .env.example .env
# .env에 로컬 인증정보 입력
npm run db:init
npm run commands:deploy
npm start
```

`.env`는 커밋하지 않는다. `DB_NAME` 기본값은 `jusigi`이고 `db:init`은 없을 때 데이터베이스를 생성한다. 원격 MySQL/Redis는 인증서 검증을 활성화한다. DB TLS 비활성은 loopback 테스트에만 허용한다. 봇 시작은 테이블 생성/삭제나 slash command 재등록을 하지 않는다. `commands:deploy`는 TOKEN과 APPLICATION_ID가 필요하다.

## 검증

```sh
npm test
# 폐기 가능한 별도 MySQL의 DB_NAME을 *_test로 설정
npm run db:init
npm run test:db
# 운영 연결에서 전용 테스트 계정을 생성하고 검증 후 제거
npm run db:smoke
```

`test:db`는 운영 데이터베이스에서 실행하지 않는다. 전용 테스트 DB 안에서 종목 가격과 테스트용 아이템 판매 설정을 변경한다. `db:smoke`는 합성 계정만 변경·삭제하며 기존 사용자와 시세는 변경하지 않는다. Discord 로그인 없이 command schema, 실행 경로, 버튼 권한 및 PNG 생성을 테스트한다.

## 명세와 운영 결정

[수정 전 대조표와 판단](docs/spec-matrix.md), [DB/구조 설명](docs/architecture.md), [검증 보고](docs/verification.md)를 참조한다.

- 대출 상환기한 일수는 명세에 없다. `LOAN_TERM_DAYS`를 설정하면 신규 차수의 기한이 고정된다. 미설정 대출은 기한이 없으며 임의로 연체시키지 않는다. 이미 발급된 차수의 이율/기한은 설정 변경으로 바뀌지 않는다.
- 3개 예시 아이템은 효과/강화/사용 경로까지 구현하지만 출시·가격이 명세에 없어 비활성으로 seed한다. 확정된 아이템은 `item_definitions.released=TRUE`, 양수 `price`를 설정하면 상점에 노출된다. seed 재실행은 운영자가 정한 값을 덮어쓰지 않는다.
- Casino Quick Pass는 명세 가격 10,000,000시기에 판매된다. 영구 권리는 파산·탈퇴 후에도 유지한다.
- 다섯고개/넌센스는 기존 기능이다. 새 미니게임과 아이템 드롭 확률은 만들지 않는다. 넌센스는 OPENAI_API_KEY가 필요하며 API 실패 시 베팅을 시작하지 않는다. AI 호출은 금융 transaction 밖에서 수행한다.
- 뉴스 API는 선택 사항이다. 키가 없거나 요청이 실패하면 명시적으로 게임 내 가상 뉴스가 생성되며 시장 주기/경제 규칙은 유지한다. OPENAI_ORGANIZATION/PROJECT/MODEL은 config 한 곳에서 읽는다.
- Redis는 시장 snapshot 캐시(30초 TTL)다. MySQL tick을 키에 포함하므로 갱신 뒤 이전 캐시 채움이 새 시세를 덮지 않는다. Redis 장애 시 DB 조회로 폴백한다. Redis 장애가 금융 transaction 성공 여부를 바꾸지 않는다.

## 주요 명령

`/가입`, `/탈퇴`, `/지갑`, `/은행 대출|상환|예금|인출|정보`, `/기부`, `/신용등급 상승요청|혜택`, `/파산신청`, `/거래 매수|매도`, `/주가표`, `/차트`, `/뉴스`, `/홀짝`, `/슬롯머신`, `/다섯고개`, `/넌센스`, `/중지`, `/아이템 목록|강화|사용`, `/상점`.

정기예금 인출은 플랜 번호를 선택하거나 생략하여 만기 플랜 전체를 인출한다. 같은 이름의 아이템이 여럿이면 `/아이템 목록`의 보유번호로 지정한다. 거래 수량은 엄격한 양의 정수 또는 `올인`이다.
