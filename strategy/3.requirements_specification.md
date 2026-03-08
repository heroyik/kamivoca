# KamiVoca (Kotoba Prime) 요구사항 정의서 (Requirements Specification)

## 1. 프로젝트 개요 (Project Overview)

- **프로젝트명**: KamiVoca (가칭: Kotoba Prime)
- **목적**: 고급 일본어 어휘 및 기초 어휘를 학습할 수 있는 게이미피케이션 기반의 모바일/웹 지원 크로스플랫폼 학습 앱 구축.
- **핵심 컨셉**: 세련된 '전통 일본(Traditional Japanese)' 테마와 'Duolingo' 스타일의 강력한 사용자 동기부여(UX/UI) 메커니즘을 결합.
- **주요 전략**: 기존 스페인어 학습 앱(`KamiVoca`)의 아키텍처를 기반으로 하되, 데이터베이스, 클라우드 리소스 및 서드파티 API를 완전히 분리하여 독립적으로 운영함.

## 2. 사용자 인터페이스 (UX/UI) 요구사항

- **전체 테마 (Look & Feel)**: 전통 일본풍과 현대적인 앱 디자인의 조화.
  - **색상 팔레트**: Washi paper (`#F6F4EB`), Ai-iro (`#165E83`), Kurenai (`#CB1B45`), Matcha Green (`#B8D200`), Kintsugi Gold (`#D4AF37`) 등 전통 색상 혼합.
  - **타이포그래피**: 헤딩은 전통 느낌의 폰트(`Shippori Mincho` 등), 본문/UI는 가독성 높은 고딕체(`Noto Sans JP` 등) 사용.
- **핵심 컴포넌트 특화**:
  - 기존 뱀 모양 경로를 '순례길(Pilgrimage Route)' 형태(예: 도리이, 대나무 숲, 진동 정원, 후지산)로 변경.
  - 레벨 달성 마커로 벚꽃(Sakura)이나 붉은 도장(Hanko) 적용.
  - 퀴즈 오답 시 하트 삭감 대신 곡옥(Magatama)이나 종이학(Origami crane) 소진 애니메이션 적용.

## 3. 핵심 기능 요구사항 (Functional Requirements)

### 3.1 Home (巡礼 - Pilgrimage) 탭: 메인 학습 경로

- **15레벨 단일 경로**: 기존 Vol 1, 2 등의 교재 선택 방식을 완전 폐기하고, 하나로 통합된 수직 스크롤 맵에서 15단계의 난이도별 레벨 경로를 제공.
- **동적 난이도 데이터 할당**: `voca_json/*.json` 형태의 다중 데이터 파일들을 통합하여 JLPT/OPIc 난이도 메타데이터에 맞춰 점수를 부여한 후, 총 15개의 덩어리로 잘라 각 레벨에 순차로 매핑.
- **학습 단위(Quiz) 진행**: 노드 클릭 시 진행되는 마이크로 러닝 시스템(10~20문제). 상단에 시각적인 진행률(Progress Bar) 표시 및 즉각적 사운드/시각 피드백(Correct: Ding!, Incorrect: Bloop!) 포함.

### 3.2 Leaderboard (ランキング - Rankings) 탭: 소셜 및 경쟁

- **주간 리그 시스템**: 브론즈, 실버, 골드, 쇼군(Shogun) 등 리그 단위로 사용자 그룹핑 (Duolingo League 유사).
- **XP 기반 랭킹**: 홈 탭에서 퀴즈를 풀 때마다 XP를 획득하며, 해당 XP를 기준으로 주간마다 사용자 승격/강등 처리.

### 3.3 Review (復習 - Fuku-shū) 탭: 오답 및 복습

- **개인 오답 노트**: 퀴즈 중 "分かりません (모르겠습니다)"를 누르거나 틀린 단어들만 모아서 다시 푸는 커스텀 퀴즈 표출.
- **Global TOP 20 Hardest Words (Wall of Pain)**: 전체 사용자가 가장 많이 틀린 단어 상위 20개를 실시간(또는 주기적 캐싱)으로 Firestore에서 가져와 목록으로 시각화.

### 3.4 Profile (マイページ - My Page) 탭: 사용자 및 설정

- **통계 표시**: 총 XP, 누적 연속 학습일(Streak, 불꽃 아이콘), 마스터한 레벨 수 등 통계 노출.
- **아바타 시스템**: 개성 있는 전통 테마 아바타 선택 기능 (예: Samurai, Ninja, Geisha, Shiba Inu).
- **학습 설정 토글**:
  - `Sound Effects (サウンド)`: 사운드 피드백 On/Off
  - `Haptics (バイブレーション)`: 진동 피드백 On/Off (모바일 기기 한정)
  - `Unlock All Levels (全レベル解放)`: 고급 학습자를 위한 전체 레벨 오픈 락해제 기능.
  - `Hide Romaji (로마자 숨기기)` 및 `Hide Furigana (후리가나 숨기기)`: 고급/하드코어 어휘 학습을 위한 읽기 보조 수단 숨김 기능.

### 3.5 퀴즈 엔진 기능 강화

- **품사(POS) 기반 오답(Distractor) 세팅**: U-verb, Ru-verb, Na-adj, I-adj 등 일본어 품사 일치 여부에 기반하여 논리적 오답을 생성하여 난이도 상향.
- **예문(Contextual Sentences) 지원**: 정답을 맞췄을 때 하단 피드백 배너 영역에 단순 "정답!"이 아니라 해당 단어의 실제 활용 예향문 표시.

## 4. 데이터베이스 및 백엔드 요구사항 (Firestore)

- **Firebase (인증/DB)**: 기존 KamiVoca 인스턴스와 완전히 분리된 신규 프로젝트 설정(완전 분리원칙 준수).
- **데이터 스키마**:
  - `users/{userId}`: 개인의 XP, 재화, 연속일수, 완료한 레벨 배열, 개인 오답 카운트 맵, 설정 정보 등 저장. 보안 규칙으로 본인만 R/W 가능하게 설정.
  - `leaderboards/{leagueId}/users/{userId}`: 주간 랭킹 표시를 위한 퍼블릭 데이터 (표시명, 아바타, 주간 XP 한정).
  - `globalStats/words`: 유저들이 틀린 단어들의 총 실패 카운트 누적 문서들 (Top 20 산출용). FireStore Quota(READ 한도) 초과를 방지하기 위해 로컬 캐싱 및 디바운스/배치 쓰기 등 철저한 한도 관리 로직 필수 추가.

## 5. 비기능 및 시스템 요구사항 (Non-Functional Requirements)

- **보안 및 규정**: 서드파티 의존성 분리, 외부 API 계정 독립, 사용자 인가(Authorization) 및 Firestore 규정(Security Rules) 준수.
- **성능 및 비용 최적화**: 중복 체크 시 급격한 성능 저하 방지를 위한 자료구조 도입. 대량 데이터에서 최대 ID 스캔 시 발생할 수 있는 스택 오버플로우 방지.
- **웹 호환성 및 크로스 브라우징 조건**: 요구된 규정에 따라 다음의 환경에서 화면이나 기능, 사운드, 애니메이션이 동일하게 동작하는지 100% 매끄러운 호환성을 검증해야 함.
  - **PC 데스크톱**: Windows (Chrome 브라우저), macOS (Safari 브라우저)
  - **모바일 디바이스**: Galaxy S25 (Chrome 브라우저 기준의 일반 모델 뷰포트), iOS 장비 (Safari 브라우저)
