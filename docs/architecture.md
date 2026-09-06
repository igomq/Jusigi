# 구조와 DB 계약

## 실행 경계

Discord commands/routes → Economy 또는 Market service → 공통 domain/rules·money·credit → repository의 parameterized 실행/잠금 helper → mysql2/promise pool.

commands는 옵션을 변환하고 결과를 표시한다. `Economy.execute`가 하나의 연결에서 요청 멱등성, 계정 잠금, 신용 판정, 금융 변경, 회계 기록을 함께 commit한다. service에 있는 SQL은 repository helper로 parameter binding하여 실행한다. 규모가 작은 프로젝트이므로 별도 interface/factory 계층은 만들지 않았다.

모든 사용자 경제 요청은 `users ... FOR UPDATE`로 직렬화된다. 요청 ID는 PRIMARY KEY이며 사용자/operation/payload hash가 다르면 재사용을 거부한다. 성공 결과가 있으면 재실행하지 않고 저장 결과를 반환한다. 실패는 요청 기록까지 rollback한다. 거래는 시가 row를 FOR SHARE로 잠그고 잔액·보유수량·취득원가·수수료·아이템효과·실현손익을 동시에 저장한다.

파산/탈퇴는 대출, 보통/정기예금, 보유주식, 진행 중 게임 및 도박 이력을 단일 transaction으로 삭제한다. 유저 row, 최초 가입일, 기부액, 신용 변경 감사 이력, 아이템, 영구 패스 및 cooldown은 보존한다. 재가입 시 최초 가입 보상을 다시 주지 않고 개인회생을 적용한다.

## 테이블

| 테이블 | 역할 / 핵심 key·관계·index |
|---|---|
| schema_migrations | 파일 버전 PK, SHA256 checksum, 적용시각. 변경된 기적용 파일 거부 |
| users | Discord ID 문자열 PK, active/withdrawn, BIGINT 잔액, 1~4 credit, 가입/등급/경제활동/대출/탈퇴시각, 기부누계. status/economic_at index |
| requests | 요청 ID PK, actor/op/hash/result. 가입 전에도 존재하므로 user FK 없음. user/time index |
| credit_history | 변경 전후 등급과 이유. user FK RESTRICT, user/time index |
| economic_events | 모든 성공 요청의 잔액 delta와 결과 감사 기록. user/request FK, user/type/time index. 기부/상환/상점/아이템사용/강화 내역도 여기에 기록 |
| loans | 차수 PK, user FK, 남은 원금/복리 잔액/고정 이율/발급·이자기준·만기시각. user/opened 및 user/due index |
| savings | user PK/FK, 단일 보통예금 원금/고정 이율/시작 시각 |
| term_deposits | 플랜 PK, user FK, 가입일/만기일/기간/이율/원금. user/maturity index. 동시 여러 건 |
| stock_definitions | 종목 PK, 색상, 초기 가격. 정적 JSON에서 seed |
| stock_prices | 종목 PK/FK, 현재 가격/갱신시각 |
| stock_history | (종목,tick) PK, 가격/시각. 최신 250개는 조회 제한이며 장기 이력은 DB에 유지 |
| holdings | (user,종목) PK, 각각 FK, 수량과 총 취득원가. 평균은 파생값 |
| stock_trades | 거래 PK, 요청 UNIQUE/FK, user/종목 FK, 가격·수량·배분원가·수수료·효과·실현손익·당시신용 snapshot |
| news | 뉴스 PK, tick UNIQUE, 종목 FK, 감성/제목/요약/발행시각 |
| market_state | singleton PK=1, tick/마지막·다음갱신/실제간격/활성뉴스 FK. 전체 tick transaction lock |
| casino_state | (user,type) PK, 마지막 이용시각. 게임별 cooldown |
| gambling_history | PK, user FK, 게임/베팅/세전손익/세금/순손익/결과. user/time index로 최근 이력 및 등급 변경 이후 손익 계산 |
| entitlements | (user,type) PK, 영구 권리·구입시각 |
| item_definitions | 종류 PK, 이름 UNIQUE, consumable/passive, 효과·기본율·사용횟수·판매가격·출시여부 |
| inventory | 개별 보유 PK, user/종류 FK, 등급/남은횟수/획득시각. user/item index |
| minigame_sessions | (user,type) PK, session UUID UNIQUE, 상태/문제/만료/쿨타임. 무베팅 미니게임은 casino 이력과 분리 |
| games | (user,type) PK, session UUID UNIQUE, 베팅 예치금/진행 JSON/시각. 재시작 후 이어가기 가능 |

금액/필수 시각은 NOT NULL이며 FK는 전부 RESTRICT한다. 자동 cascade로 경제 상태가 사라지지 않도록 초기화 목록을 transaction에서 명시한다. nullable 값은 미보유 활성뉴스·관리자가 판매를 중단한 가격·미발생 시각이다. 대출 만기는 신규 발급과 기존 NULL 보정 모두 적용한다. 원금·보유수량·등급 등에는 CHECK 제약을 둔다.

## 계산과 파생 상태

- MySQL BIGINT는 문자열로 읽고 모든 돈/수량 연산은 JS BigInt로 수행한다. 허용 상한은 signed BIGINT이다. Discord numeric 입력은 safe integer만 허용한다.
- 이율은 1억분율 정수. 1% = 1,000,000. 일복리는 완전한 24시간마다 이자를 정수로 버려 자본화한다. 단리는 원금×완전한 일수×이율이다. 세금/수수료는 최종 양수 계산값을 버린다.
- 남은 대출 원금과 자본화 잔액을 구분한다. 상환은 오래된 차수의 이자부터, 그 다음 원금이다. 추가 대출은 새 차수이며 기존 이율/일 경계가 변하지 않는다.
- 대출 추가 가능액과 신용상승 순자산, 평균매입가, 예금 평가액, 최근 도박 여부, 순손익은 파생값이다. 원천 row/시각을 보존하고 UI와 명령에서 재계산하지 않는다.
- 부분매도는 총 취득원가를 수량 비례로 버림 배분하고 잔여 원가를 보존한다. 마지막 매도는 잔여 원가 전체를 배분해 합계가 정확히 보존된다. 손실 여부는 매도가×전체수량과 총 취득원가 비교로 판정한다.
- 주식 손실/이익 아이템은 수수료 이전 손익에 적용하며 수수료는 원래 손실 여부로 결정한다. 최고 등급 효과 하나만 적용한다.
- 기존 퀴즈는 시작 때 베팅금을 예치하고 종료 때 원금과 순손익을 한 번만 정산한다. 도박 순자산 평가에는 아직 진행 중인 예치금을 포함한다. 중지는 기존 환급 공식을 사용하며 모든 종료 경로가 같은 도박 이력을 남긴다.

## 운영 및 migration

`db:init`은 명시 실행만 가능하다. GET_LOCK으로 migration 동시 실행을 막고 파일 checksum을 확인한다. MySQL DDL은 암묵 commit이므로 SQL 중간 실패 시 해당 migration을 자동 완료 처리하지 않는다. 원인과 적용된 테이블을 확인하고 누락 문장을 보수적으로 복구한 뒤 migration 기록을 처리해야 한다. 정상 재실행은 seed와 schema 모두 현재 상태를 덮어쓰지 않는다.

가격/뉴스 tick은 singleton lock 안에서 원자적으로 갱신한다. serial timer는 중첩 실행하지 않는다. 재시작하면 DB next_update_at을 기준으로 처리하며 누락된 시간에 가상 변동을 대량 생성하지 않는다. 안정화 강제 상승/하락과 로컬 JSON write는 제거했다.

가격 이력·감사 기록은 자동 삭제하지 않는다. 규모가 커지면 운영 보존 정책에 맞춘 archive/partition 작업이 필요하다. Redis는 현재 연결이 끊기면 DB fallback을 사용하고 재시작 시 재연결한다.

미니게임의 잔액 보상·패시브 드롭·세션 종료·요청 결과는 같은 계정 transaction에 포함된다. 획득 이력은 economic_events 결과의 itemDrop에 기록한다. 같은 요청은 결과를 재사용하고 다른 요청으로 종료된 세션을 재실행하면 거부한다.
