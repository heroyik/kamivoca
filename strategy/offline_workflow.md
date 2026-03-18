# Offline Workflow

## 목적

이 문서는 KamiVoca가 `OFFLINE ready!` 상태가 된 뒤 실제로 오프라인에서 어떻게 공부 가능한지, 어떤 데이터가 로컬에 남고 어떤 동기화가 일어나는지를 현재 구현 기준으로 정리한 문서입니다.

중요한 전제:
- 현재 오프라인 학습은 관리자 Google 계정만 허용됩니다.
- 일반 사용자와 게스트는 오프라인 상태에서 차단됩니다.
- 오프라인 학습은 서비스워커 캐시 + Firestore 브라우저 로컬 캐시 + `localStorage` 저장값에 의존합니다.

## 현재 구현 요약

오프라인 학습은 다음 세 축으로 성립합니다.

1. 라우트와 정적 자산 캐싱
2. 브라우저에 남아 있는 런타임 vocab 데이터
3. 학습 상태의 로컬 저장 및 Firestore 오프라인 큐

실제 관련 코드:
- 서비스워커 등록: [src/components/ServiceWorkerRegistrar.tsx](/Users/ikyoon/proj/kamivoca/src/components/ServiceWorkerRegistrar.tsx)
- 오프라인 게이트: [src/components/OfflineModeGate.tsx](/Users/ikyoon/proj/kamivoca/src/components/OfflineModeGate.tsx)
- 서비스워커 구현: [public/sw.js](/Users/ikyoon/proj/kamivoca/public/sw.js)
- 오프라인 자산 매니페스트 생성: [scripts/generate-offline-manifest.mjs](/Users/ikyoon/proj/kamivoca/scripts/generate-offline-manifest.mjs)
- Firestore persistent cache: [src/lib/firebase.ts](/Users/ikyoon/proj/kamivoca/src/lib/firebase.ts)
- 학습 상태 로컬 저장: [src/contexts/GamificationContext.tsx](/Users/ikyoon/proj/kamivoca/src/contexts/GamificationContext.tsx)

## Offline Ready가 되는 조건

홈 헤더에 `OFFLINE ready!`가 보인다는 뜻은 아래 조건이 충족됐다는 의미입니다.

1. 서비스워커가 등록됨
2. 서비스워커가 활성화됨
3. `offline-assets.json`이 캐시에 들어감
4. 기본 쉘 라우트와 정적 자산이 캐시에 들어감

판정 흐름:
- `ServiceWorkerRegistrar`가 `navigator.serviceWorker.register()` 실행
- 등록 후 현재 active worker에 `OFFLINE_STATUS` 메시지 전송
- 서비스워커가 `isOfflineReady()`로 캐시 상태 확인
- 준비 완료 시 `document.documentElement.dataset.offlineReady = "true"`
- 홈 화면이 이를 읽어 `OFFLINE ready!` 칩 표시

즉 `OFFLINE ready!`는 단순 설치 완료가 아니라, 실제 캐시 확인을 통과했다는 뜻입니다.

## 서비스워커가 캐시하는 것

서비스워커는 [public/sw.js](/Users/ikyoon/proj/kamivoca/public/sw.js)에서 동작합니다.

### Precaching 대상 라우트

기본 라우트:
- `/kamivoca/`
- `/kamivoca`
- `/kamivoca/quiz/review`
- `/kamivoca/quiz/unit-1` ~ `/kamivoca/quiz/unit-15`

### Precaching 대상 자산

`offline-assets.json`에 담긴 자산:
- `/_next/static/*`
- `images/*`
- `sounds/*`
- css/js/json/icon/font류 정적 파일

이 매니페스트는 빌드 후 [generate-offline-manifest.mjs](/Users/ikyoon/proj/kamivoca/scripts/generate-offline-manifest.mjs)로 생성됩니다.

### fetch 전략

정적 자산:
- `cacheFirst`

페이지 네비게이션:
- `navigateResponse()`
- 온라인이면 네트워크 우선
- 오프라인이면 캐시된 쉘 라우트 반환

기타 같은 origin GET:
- `networkFirst`
- 실패 시 캐시 fallback

## 오프라인에서도 공부가 가능한 이유

### 1. vocab 자체는 번들 데이터 기반

퀴즈의 기본 vocab 데이터는 Firestore에서 직접 가져오지 않고 [src/data/vocab.json](/Users/ikyoon/proj/kamivoca/src/data/vocab.json)을 클라이언트 번들에 포함해 사용합니다.

런타임 기준:
- `baseVocabEntries = vocabData.data`
- 최종 사용 데이터는 `vocabEntries`

즉, 캐시된 앱 번들이 이미 있으면 기본 vocab은 오프라인에서도 읽을 수 있습니다.

### 2. Firestore는 브라우저 로컬 캐시를 사용

[firebase.ts](/Users/ikyoon/proj/kamivoca/src/lib/firebase.ts)에서 Firestore는 아래 설정으로 초기화됩니다.

- `persistentLocalCache`
- `persistentSingleTabManager`

이 의미:
- 이전에 읽었던 Firestore 문서는 브라우저에 로컬 캐시됨
- `adminDeletedWords`
- `adminVocabOverrides`
- `users/{uid}/manualCognites`
- `users/{uid}` 학습 상태

같은 데이터는 오프라인에서도 마지막 캐시 상태를 바탕으로 사용할 수 있습니다.

### 3. 학습 상태는 localStorage에도 저장

사용자 학습 상태는 `kamivoca_stats`라는 키로 `localStorage`에도 저장됩니다.

저장되는 주요 상태:
- XP
- gems
- streak
- completedUnits
- masteredUnits
- mistakes
- unitStats
- settings

즉 Firestore가 순간적으로 불안정해도 현재 디바이스에서는 이어서 학습 가능합니다.

## 오프라인에서 실제 가능한 사용자 플로우

준비가 끝난 상태라면 아래 흐름이 가능합니다.

1. 온라인 상태에서 앱 접속
2. 관리자 Google 계정 로그인
3. 홈 헤더에 `OFFLINE ready!` 표시 확인
4. 홈, 리뷰, 학습할 unit 페이지를 한 번 이상 열어둠
5. 네트워크를 끊음
6. 같은 탭 또는 설치된 shortcut으로 앱 재진입
7. 홈에서 unit 선택
8. 퀴즈 풀이
9. 오답 리뷰
10. 학습 진행상태는 로컬에 유지

오프라인 중 UI 표식:
- 홈 헤더: `OFFLINE`
- 상단 배너: `Admin Offline Mode`

## 오프라인 중 가능한 기능

현재 구현 기준으로 기대 가능한 기능:
- 홈 진입
- unit 목록 보기
- review 진입
- `unit-1` ~ `unit-15` 퀴즈 진입
- 캐시된 정적 이미지/사운드 사용
- 이미 로그인된 관리자 세션 유지
- 로컬 vocab 기반 퀴즈 진행
- mistakes 증가
- completed unit 갱신
- XP / gems / streak 반영
- profile 기반 설정값 유지
- 이전에 읽힌 manual cognite 상태 반영
- 이전에 읽힌 admin delete / admin override 상태 반영

## 오프라인 중 제한되는 기능

현재 구조상 제한되거나 보장되지 않는 것:
- 새 Google 로그인 시작
- 처음 보는 배포 버전의 첫 진입
- 캐시되지 않은 새 경로 직접 오픈
- 실시간 leaderboard 최신성
- 오프라인 상태에서 처음 보는 원격 데이터
- 다른 브라우저/다른 디바이스와의 즉시 일치

추가 주의:
- 완전히 새 탭에서 바로 오프라인 진입하면 캐시가 아직 없을 수 있음
- 배포 직후 첫 접속은 반드시 온라인이어야 최신 서비스워커가 설치됨

## 계정 제한

오프라인 모드 허용 조건:
- 로그인된 계정의 이메일이 `NEXT_PUBLIC_KAMI_ADMIN_KEY`와 일치

판정 위치:
- [GamificationContext.tsx](/Users/ikyoon/proj/kamivoca/src/contexts/GamificationContext.tsx)
- `isOfflineMode = !isOnline && isAdminUser`
- `isOfflineModeBlocked = !isOnline && !isAdminUser`

차단 시 동작:
- `OfflineModeGate`가 전체 blocker 화면 표시
- 일반 사용자는 오프라인 학습 불가

## 오프라인 중 데이터 저장 방식

### 학습 진행 상태

저장 위치:
- `localStorage["kamivoca_stats"]`
- Firestore 로컬 캐시 / pending writes

업데이트 함수:
- `saveStatsLocally()`
- 내부에서 `syncStatsToCloud()` 호출

이 의미:
- 사용자의 진행 상황은 우선 로컬에 반영됨
- 온라인이면 곧바로 Firestore에도 반영
- 오프라인이면 Firestore SDK의 로컬 캐시와 pending write 메커니즘에 의존

### manual cognites

컬렉션:
- `users/{uid}/manualCognites`

의미:
- 이전에 캐시된 상태는 오프라인에서도 표시 가능
- 오프라인 중 새 변경은 Firestore 오프라인 write 큐 동작에 의존

### admin override / global delete

컬렉션:
- `adminVocabOverrides`
- `adminDeletedWords`

의미:
- 이전에 읽힌 값은 오프라인에서도 런타임 병합에 반영됨
- 오프라인에서 관리 기능을 새로 쓰는 것은 기술적으로 일부 가능하더라도 운영상 권장되지 않음

## 온라인 복귀 시 동기화

### 학습 상태

현재 구현은 학습 상태를 저장할 때마다 `syncStatsToCloud()`를 호출합니다.

온라인 상태:
- Firestore에 바로 반영

오프라인 상태:
- 브라우저 로컬 상태는 즉시 반영
- Firestore는 persistent cache / pending writes 메커니즘을 통해 복귀 후 반영될 수 있음

운영 관점 권장:
- 비행기 모드 해제 후 앱을 잠시 열어 두기
- 홈/리뷰/프로필을 한 번씩 열어 상태가 안정적으로 동기화됐는지 확인

주의:
- 배너 문구는 “온라인 복귀 시 자동 동기화”라고 안내하지만, 실제 신뢰성은 Firestore 오프라인 write 큐와 브라우저 상태에 달려 있습니다.
- 따라서 중요한 세션 후에는 온라인 복귀 뒤 앱을 다시 열어 동기화 완료를 확인하는 운영 습관이 안전합니다.

## 실제 권장 오프라인 준비 절차

### 출발 전 체크리스트

1. Chrome 또는 설치된 PWA에서 앱 실행
2. 관리자 계정 로그인
3. 홈 헤더에 `OFFLINE ready!`가 보일 때까지 대기
4. 홈 열기
5. 리뷰 열기
6. 실제 공부할 `unit` 페이지를 1회 이상 열기
7. 소리 사용 예정이면 퀴즈에서 정답/오답 사운드도 한 번 재생 확인
8. 탭을 닫지 않은 상태에서 네트워크 끊기

### 비행기 모드 진입 후

1. 같은 탭 또는 설치된 바로가기에서 앱 사용
2. `OFFLINE` 표시 확인
3. 홈 -> 유닛 -> 퀴즈 -> 리뷰 순으로 사용

### 복귀 후

1. 네트워크 연결 복구
2. 앱 재오픈
3. 잠시 대기
4. 프로필/홈/리뷰를 열어 상태 반영 확인

## 오프라인 학습에서 중요한 데이터 의존성

오프라인 학습 가능성은 아래 데이터가 준비되었는지에 달려 있습니다.

### 반드시 있어야 하는 것

- 캐시된 앱 쉘
- 캐시된 JS/CSS 번들
- 캐시된 unit 라우트
- 브라우저에 남아 있는 로그인 세션
- 로컬 `kamivoca_stats`

### 있으면 좋은 것

- 최근 읽어온 `manualCognites`
- 최근 읽어온 `adminDeletedWords`
- 최근 읽어온 `adminVocabOverrides`

## 현재 설계의 장점

- vocab 본체가 번들 포함형이라 오프라인 퀴즈 자체는 강함
- Firestore persistent cache가 있어 원격 상태도 어느 정도 유지됨
- `localStorage`에 학습 상태를 별도로 보관해서 복원력이 좋음
- 서비스워커가 unit 라우트를 명시적으로 precache함

## 현재 설계의 리스크와 한계

1. 오프라인 허용이 관리자 계정에만 묶여 있음
2. 서비스워커 캐시 준비 전에는 사용자가 안전 여부를 체감하기 어려움
3. 새 배포 직후엔 반드시 온라인 진입이 필요함
4. 실시간 leaderboard나 새로운 Firestore 데이터는 오프라인 보장이 약함
5. “자동 동기화”는 브라우저/Firestore 오프라인 큐 상태에 의존하므로 운영상 재확인이 필요함

## 향후 개선 아이디어

오프라인 학습을 더 강하게 만들고 싶다면 다음 순서가 좋습니다.

1. 일반 사용자까지 오프라인 허용 범위 확대
2. 최근 학습한 unit을 명시적으로 “다운로드”하는 UI 추가
3. 오프라인 write pending 상태를 화면에 표시
4. 동기화 완료/실패 상태 표시
5. leaderboard는 오프라인 fallback UI 분리
6. service worker cache version과 앱 version을 더 명확히 연동
7. `offline-assets.json` 준비 실패 시 사용자 경고 추가

## 결론

현재 KamiVoca는 “미리 준비된 관리자 계정 세션” 기준으로는 오프라인 학습이 가능한 구조입니다.
핵심은 `OFFLINE ready!` 확인, 관리자 로그인 유지, 필요한 unit 사전 방문입니다.

실제 공부는 오프라인에서도 계속할 수 있고, 진행 상태는 로컬에 남습니다.
다만 운영상 가장 안전한 방식은 온라인 복귀 후 앱을 다시 열어 동기화 완료를 확인하는 것입니다.
