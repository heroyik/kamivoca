# KamiVoca Implementation Plan

이 문서는 기존 스페인어 학습 앱 `HolaVoca`의 아키텍처를 바탕으로 전통적이고 세련된 일본어 학습 앱 `KamiVoca(Kotoba Prime)`를 구축하기 위한 상세 실행 계획(Blueprint)입니다.

> [!CAUTION]
> **핵심 개발 원칙: 완전한 리소스 분리**
> 기존 `HolaVoca`에서 사용하던 외부 API 키, Cloud 서비스 계정, 데이터베이스 인스턴스 등은 **절대로 KamiVoca와 공유하거나 재사용해서는 안 됩니다.** 모든 클라우드(Firebase 등) 및 서드파티 서비스는 완전하게 별개로 구축하여 연동합니다.

## User Review Required

> [!IMPORTANT]
> **해결된 선결 과제 (Action Items)**
>
> 1. **아바타 에셋**: Gemini + Nano Banana 스타일 프롬프트를 활용하여 4종의 아바타(Samurai, Ninja, Geisha, Shiba Inu) 이미지를 생성 후 `public/images/avatars/`에 배치합니다.
>    - *제안 프롬프트*: "A simple, cute, flat 2D vector icon of a [Samurai/Ninja/Geisha/Shiba Inu] wearing traditional Japanese clothing. The style should be extremely minimalistic, colorful, and playful, similar to casual mobile game design (like Duolingo or Nano Banana). Solid background, no outlines, soft rounded shapes."
> 2. **초기 Voca JSON 데이터**: `src/data/voca_json/japanese_opic.json` (및 레벨별 JSON 형식)을 생성하여 초기 앱 구동 시뮬레이션 및 렌더링 검증에 사용합니다.
> 3. **Firebase 프로젝트 분리**: 앱 분리를 위해 새 Firebase 프로젝트(예: `kamivoca-app`) 생성을 진행하고, `firebase.json` 및 `.firebaserc` 설정을 새 환경으로 연동(초기화)합니다.

---

## Proposed Changes

과업은 시스템 계층과 컴포넌트 단위로 분리하여 진행합니다.

| Phase | Component Area | Key Objective |
| --- | --- | --- |
| 1 | **Foundation & Data** | 테마 설정(Tailwind), 일본어 처리 로직, JSON 통합 파이프라인 구축 |
| 2 | **Database & Gamification** | Firestore 읽기/쓰기 최적화, Global Top 20 및 리뷰 탭 구현 |
| 3 | **Core UX: Pilgrimage Map** | 15단계 순례길 맵, Volume 선택 제거, 전통 테마 메인 화면 구축 |
| 4 | **Core UX: Quiz Engine** | POS 기반 오답 생성, 예문 표시, 하트(생명) 시스템 도입 |
| 5 | **Profile & Settings** | 아바타 시스템 변경, 세부 설정(로마자 숨기기 등) 및 로컬라이제이션 |

---

### 1. Foundation & Data Pipeline (기반 설정 및 데이터)

가장 먼저 앱의 시각적 기반(색상, 폰트)과 단어 데이터를 불러오는 로직을 개편합니다.

#### [MODIFY] `tailwind.config.ts`

- 기존 스페인어 테마 색상을 제거하고, 명세된 전통 일본어 색상 팔레트를 추가합니다.
  - `washi-paper`: `#F6F4EB`
  - `ai-iro`: `#165E83`
  - `kurenai`: `#CB1B45`
  - `matcha-green`: `#B8D200`
  - `kintsugi-gold`: `#D4AF37`
- 글꼴 설정을 업데이트합니다 (예: `Shippori Mincho`, `Noto Sans JP`).

#### [MODIFY] `src/app/globals.css`

- 기본 배경색을 `washi-paper`로 변경하고, 스크롤바 등 기본 스타일링을 일본어 폰트와 어울리게 조정합니다.

#### [NEW] `src/data/voca_json/sample.json`

- 기존 `vocab.json`을 대체할 다중 JSON 구조의 예시 파일을 생성합니다. (각 단어는 `jlpt_level`, `pos` 파트를 포함해야 합니다).

#### [MODIFY] `src/utils/vocab.ts`

- 기존 Vol 1 / Vol 2 분리 로직을 **완전 삭제**합니다.
- `voca_json/` 안의 JSON을 모두 합쳐서 JLPT 레벨 기반 15등분으로 자르는 로직(`getWordsForLevel` 등)을 구현합니다.
- 일본어 품사(POS) 기반 오답(Distractor) 생성을 위한 로직(U-verb, Ru-verb, Na-adjective 등)을 추가합니다.

---

### 2. Database & Gamification (데이터베이스 및 상태 관리)

> [!WARNING]
> 데이터베이스 I/O가 잦은 부분입니다. Firestore 읽기/쓰기 요금(Quota)이 과도하게 발생하지 않도록, `globalStats/words`의 업데이트는 배치(Batch) 처리나 클라이언트 로컬 캐싱 디바운스를 활용해 최적화합니다.

#### [MODIFY] `src/lib/firebase.ts` & `firestore.rules`

- 새로운 `globalStats/words` 컬렉션에 대한 보안 규칙(Increment만 허용 등)을 정의합니다.

#### [MODIFY] `src/contexts/GamificationContext.tsx`

- 사용자 정보 스키마에서 기존 `mistakes` 객체에 더불어, 일본어 리뷰를 위한 메타데이터를 추가 관리합니다.
- 오답 시 `globalStats/words/{word}` 문서의 `failCount` 필드를 `FieldValue.increment(1)` 하여 누적시키는 훅 체인을 구성합니다.

#### [MODIFY] `src/hooks/useGlobalTop20.ts`

- `collection("globalStats/words").orderBy("failCount", "desc").limit(20)` 쿼리를 통해 가장 많이 틀린 20개의 일본어 단어를 가져오는 로직을 작성합니다. 읽기 최소화를 위해 로컬 캐시를 최우선으로 활용합니다.

---

### 3. Core UX: The Pilgrimage Map (메인 홈 지도)

#### [MODIFY] `src/app/page.tsx`

- 기존 Vol. 1 / Vol. 2를 선택하는 헤더나 토글을 완전히 삭제합니다.
- '巡礼 (Pilgrimage)' 컨셉에 맞춰, 시작부터 끝까지 이어지는 15단계의 수직 맵 UI를 렌더링합니다.

#### [MODIFY] `src/components/MapNode.tsx` (기존 유닛 컴포넌트)

- 통과하지 않은 노드: 흑백 모드의 Torii ⛩️ (또는 흐릿한 엠블럼).
- 마스터한 노드 (👍 Thumbs Up 대체): 벚꽃(Sakura 🌸) 또는 '極' 문구가 담긴 붉은 도장(Hanko) 아이콘 적용.

---

### 4. Core UX: Quiz Engine (퀴즈 엔진)

#### [MODIFY] `src/components/Quiz.tsx`

- **배너 피드백**:
  - Correct 시 초록색 배너와 쾌활한 'Ding!' 소리, 그리고 해당 단어의 **예문(Contextual Sentence)** 노출 기능 추가.
  - Incorrect 시 붉은 배너와 'Bloop!' 사운드 처리.
- **버튼 텍스트 변경**: "No Lo Sé" -> "分かりません (모르겠습니다)"로 변경, 폴딩 팬(Sensu) 아이콘 사용.
- **Heart System 시각화**: 퀴즈 상단에 Magatama(곡옥) 또는 종이학 이미지를 배치하여 오답 시 아이콘이 깎이는 애니메이션 추가.

#### [MODIFY] `src/components/ReviewTab.tsx`

- 오답 노트(개인 실수)와 **Global TOP 20 Hardest Words**를 토글/탭 형태로 볼 수 있도록 UI 개편.

---

### 5. Profile & Settings (프로필 및 설정)

#### [MODIFY] `src/components/UserProfile.tsx`

- 아바타 선택 화면 업데이트 (Samurai, Ninja, Geisha, Shiba Inu 등).
- 일본어 학습 전용 설정 토글 추가:
  - `Hide Romaji (로마자 숨기기)`
  - `Hide Furigana (후리가나 숨기기)` (하드코어 유저용)
  - 기존 사운드, 진동, 전 레벨 해제 토글 유지.
- 인터페이스 내 텍스트 전체 일본어화 및 어울리는 명칭 적용 (예: マイページ).

---

## Verification Plan

기능 개발 완료 후 다음 항목을 반드시 검증해야 합니다. 앱은 반응형으로 제작되어 모든 디바이스에서 매끄럽게 동작해야 합니다. (규칙 24 참조)

### 1. Automated Tests (자동화 테스트)

- `npx playwright test` 명령을 이용해 기본 e2e 테스트(볼륨 선택 관련 테스트 제거 후, 15레벨 렌더링 검증) 추가 및 통과 여부 확인.
- `markdownlint-cli`를 이용한 마크다운 문서 검증.

### 2. Manual Verification (호환성 및 기능 수동 검증)

다음의 조합에서 **UX/UI 깨짐, 소리 재생, Firestore 스파이크(Quota)** 여부를 확인합니다:

- ✅ **Windows Chrome** (데스크탑)
- ✅ **Macbook Safari** (데스크탑)
- ✅ **Galaxy S25 Chrome** (모바일: 사용자 지정 타겟 해상도)
- ✅ **iOS Safari** (모바일)

**검증 포인트:**

1. 볼륨(Vol 1/2) 스위치가 완벽히 사라지고 15단계 노드가 모두 렌더링되는가?
2. 퀴즈에서 오답을 냈을 때, Firestore의 Rate Limit을 발생시키지 않고 `globalStats/words`가 정상적으로 카운트(Increment)되는가? (중복 렌더링/API 호출 체크)
3. 정답 시 하단 배너에 일본어 예문이 정상 표기되는가?
4. 설정에서 "Hide Romaji"를 체크했을 때 퀴즈나 오답노트에서 로마자가 즉시 사라지는가?
