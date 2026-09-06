# 파일별 변경

| 파일 | 핵심 변경 |
|---|---|
| `.env.example` | 인증정보 없는 설정 설명 |
| `.github/workflows/test.yml` | Node 24 / MySQL 8.4 CI와 migration 재실행 검증 |
| `.gitignore` | env 변형 제외, lockfile 추적 |
| `README.md` | 실행/설정/초기화/검증 안내 |
| `app.js` | 명시적 service 주입, guild intent 최소화, startup 오류 및 종료 정리 |
| `commands/bank/bank.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/bank/credit.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/bank/donate.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/bank/implementation/DepositAction.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `commands/bank/implementation/DepositMethods.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `commands/bank/implementation/LoanAction.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `commands/bank/implementation/LoanMethods.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `commands/gamble/fiveask.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/gamble/halt.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/gamble/nonsense.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/gamble/oddeven.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/gamble/slots.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/items/item.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/items/shop.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/stock/news.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/stock/stock_chart.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/stock/stock_table.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/stock/stock_trade.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/user/bankrupt.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/user/purse.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/user/quit.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `commands/user/sign_in.js` | 기존 명령 UX를 명시적 service 호출로 연결; 옵션 검증 및 비동기 응답 정리 |
| `config.js` | env 기반 MySQL/Redis/OpenAI/주기 설정과 원격 TLS 검증 |
| `data/news.json` | 정적 정의 추출 후 오래된 동적 파일 삭제. 현재 상태는 DB에 저장 |
| `data/stock_data.json.bak` | 정적 정의 추출 후 오래된 동적 파일 삭제. 현재 상태는 DB에 저장 |
| `data/stocks.json` | 정적 종목/초기가/색상 정의 |
| `db/migrate.js` | DB 생성·migration lock·버전 checksum·재실행 보호 |
| `db/migrations/001_economy.sql` | 재현 가능한 관계형 스키마와 제약/index 정의 |
| `db/migrations/002_legacy_games.sql` | 재현 가능한 관계형 스키마와 제약/index 정의 |
| `db/pool.js` | mysql2/promise pool, commit/rollback/finally release |
| `db/seed.js` | 기존 경제를 덮어쓰지 않는 종목/예시 아이템 seed |
| `docs/architecture.md` | 명세 출처·결정·설계·검증 내용 문서화 |
| `docs/spec-matrix.md` | 명세 출처·결정·설계·검증 내용 문서화 |
| `docs/verification.md` | 명세 출처·결정·설계·검증 내용 문서화 |
| `domain/money.js` | BigInt 검증·일수·정수 이율·복리·JSON 경계 |
| `domain/rules.js` | 신용별 이율/세금/한도, 아이템 표, 주식·도박·주가 규칙 |
| `events/interactionCreate.js` | 명시적 라우팅/소유자 검사/await/error 처리 |
| `events/messageCreate.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `events/ready.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `log.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `manager/PriceManager.js` | 중첩 없는 DB 주가 갱신 loop |
| `manager/RouteManager.js` | global 제거, 명시적 client route 의존성 |
| `models/Bank.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `models/Casino.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `models/Deposit.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `models/Stock.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `models/User.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `package-lock.json` | 재현 가능한 의존성 잠금 |
| `package.json` | Discord.js 14.27.0, mysql2/Redis/skia-canvas, 검증/DB CLI |
| `repositories/economy.js` | parameter binding 및 계정/원천 row 조회·잠금 |
| `routes/BankruptButton.js` | 계정 소유자/요청·세션 ID를 사용한 중복 정산 방지와 DB service 연결 |
| `routes/FiveAskButton.js` | 계정 소유자/요청·세션 ID를 사용한 중복 정산 방지와 DB service 연결 |
| `routes/FiveAskModal.js` | 계정 소유자/요청·세션 ID를 사용한 중복 정산 방지와 DB service 연결 |
| `routes/NonsenseButton.js` | 계정 소유자/요청·세션 ID를 사용한 중복 정산 방지와 DB service 연결 |
| `routes/OddEvenButton.js` | 계정 소유자/요청·세션 ID를 사용한 중복 정산 방지와 DB service 연결 |
| `scripts/smoke.js` | 실제 DB/Redis 왕복 및 합성 계정 한정 cleanup |
| `services/cache.js` | Redis TLS와 장애 시 DB fallback |
| `services/credit.js` | 순자산·상승·강등·시각/이력 처리 단일화 |
| `services/economy.js` | 멱등 계정 transaction, 은행·매매·도박·아이템·계정 흐름 통합 |
| `services/legacy-games.js` | 기존 퀴즈 예치/진행/힌트/중지/정산/재시작 persistence |
| `services/market.js` | 주가/뉴스/이력 DB transaction 및 tick 기반 cache |
| `services/news-provider.js` | 선택적 AI 뉴스 provider, timeout/응답 처리 |
| `test/cache.test.js` | 계산/권한/동시성/rollback/영속성 회귀 검증 |
| `test/commands.test.js` | 계산/권한/동시성/rollback/영속성 회귀 검증 |
| `test/integration/economy.test.js` | 계산/권한/동시성/rollback/영속성 회귀 검증 |
| `test/legacy-games.test.js` | 계산/권한/동시성/rollback/영속성 회귀 검증 |
| `test/rules.test.js` | 계산/권한/동시성/rollback/영속성 회귀 검증 |
| `util/command.js` | await/defer, 한국어 경제 결과, 긴 내역 첨부, 게임 UI 공통 응답 |
| `util/createChart.js` | 실제 시각 x축, PNG export 뒤 chart 자원 해제 |
| `util/query_data.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `util/query_db.js` | 호출처 제거 후 중복/죽은 구현 삭제. 금융 규칙은 공통 service/domain으로 이전 |
| `util/registerSlashCommands.js` | 로그인 없는 명령 로더 및 명시적 배포 CLI |

## 후속 출시 변경

| 파일 | 변경 |
|---|---|
| data/items.json, db/seed.js | 세 아이템 출시 가격과 재현 가능한 seed |
| db/migrations/003_launch_rules.sql | 기존 무기한 대출 유예 보정, 아이템 출시 |
| db/migrations/004_minigames.sql | 무베팅 미니게임 영속 세션 |
| config.js, .env.example | 기본 대출 만기 7일 |
| domain/rules.js, services/items.js | 드롭 확률, 신용 보너스, 해킹툴 확률형 효과, 원자 지급 |
| domain/minigames.js, services/minigames.js | 계산/기억 게임 생성·보상 snapshot·쿨타임·한 번 정산 |
| services/economy.js, services/legacy-games.js | 드롭 transaction, 파산/중지 종료, 기존 게임 드롭 |
| commands/games/arithmetic.js, commands/games/memory.js | 신규 slash commands |
| routes/MiniGameButton.js, events/interactionCreate.js, util/command.js | 소유자 검증, 모달, 숫자 숨김, 드롭 결과 |
| scripts/smoke.js, test/* | 출시/미니게임 검증과 테스트 계정 정리 |
| docs/launch-decisions.md, README.md, docs/architecture.md, docs/spec-matrix.md, docs/verification.md | 확정 결정과 검증 결과 |
