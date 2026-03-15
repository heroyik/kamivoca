# 🇯🇵 KamiVoca (v2.2.0) - Advanced Japanese Vocabulary App

`Version 2.2.0`

---

KamiVoca is a premium, gamified Japanese learning platform inspired by modern educational apps like Duolingo, but built with a deep, traditional Japanese atmosphere. It is designed to help users achieve god-tier (神) mastery of Japanese vocabulary through an immersive, mobile-optimized journey and a real-time competitive leaderboard.

---

## ✨ Key Highlights

### ⛩️ Gamified "Pilgrimage Route" UI

A winding, interactive learning path that visually guides users through 15 difficulty-sorted stages based on JLPT (N5 to N1) and OPIc frameworks.

- **Thematic Progression**: Travel from a coastal Torii gate, through a Bamboo Forest and Zen Rock Garden, all the way to Mount Fuji at Level 15.
- **Satisfying Flow**: Nodes turn from grey to vibrant, glowing icons upon completion.
- **Mastery Badges**: Mastered units feature a blooming **Sakura (Cherry Blossom)** or a **Hanko (Traditional Red Seal)** inscribed with "極" (Mastery).

### 🎨 Traditional Japanese Aesthetics

- **Bespoke Palette**: Crafted with traditional hues like Washi paper (`#F6F4EB`), Ai-iro Indigo (`#165E83`), Kurenai Crimson (`#CB1B45`), Matcha Green (`#B8D200`), and Kintsugi Gold (`#D4AF37`).
- **Typography**: A blend of elegant Shodo-style Mincho headers and clean modern Gothic body text for readable Kanji.
- **High-Tension Japanese Audio**: Features native Japanese female voice-overs (Mizuki voice) converted to optimized MP3 format for superior web performance without quality loss.
- **Audio Feedback**: Distinct sounds and haptics for correct answers (Satisfying "Ding!") and errors (Distinct "Bloop!").

---

## 🚀 Core Mechanics

### 📚 Dynamic Difficulty Sorting

- **15-Level System**: Vocabulary is aggregated from discrete JSON files and scientifically sorted into exactly 15 levels.
  - **Stage 1 (Levels 1-5)**: N5-N4 / Novice
  - **Stage 2 (Levels 6-10)**: N3 / Intermediate
  - **Stage 3 (Levels 11-15)**: N2-N1 / Advanced
- **Strict Progression**: Users must pass sequential levels to advance, with exceptions available for advanced learners via the "Unlock All Levels" setting.

### 📝 Intelligent Quizzes

- **Contextual Learning**: Correct answers present contextual JLPT sentences (e.g., `"遠慮"` -> `✅ 正解! 💬 "ご遠慮ください。" (Please refrain from doing so.)`).
- **POS-based Distractors**: Meaningful distractors matched by Part of Speech (U-verbs with U-verbs, Na-adjectives with Na-adjectives).
- **Mistake Management ("分かりません")**: Dedicated "I don't know" action that funnels weak words to dynamic Re-Review sessions.

### ✅ Recent Updates (v2.2.0, 2026-03)

The following changes were implemented in the 2.2.0 dataset and quiz-quality pass:

1. **Version alignment**
   - Updated `package.json` and `src/lib/constants.ts` so the package version and in-app version badge both show `2.2.0`.
   - Affected files:
     - `package.json`
     - `src/lib/constants.ts`

2. **Furigana normalization for headwords**
   - Fixed duplicated-reading display cases where kana already present in the surface form was repeated in furigana.
   - Examples fixed:
     - `プー太郎` no longer renders as `プーぷーたろう`
     - `お湯` no longer renders as `おおゆ`
   - Display normalization is shared across quiz cards and review surfaces.
   - Affected files:
     - `src/utils/vocab.ts`
     - `src/components/Quiz.tsx`
     - `src/components/ReviewTab.tsx`

3. **Example sentence ruby rendering expanded**
   - Example sentences already using `漢字(かな)` continue to render via `<ruby>`.
   - Added automatic example annotation for current quiz words and difficult vocabulary appearing inside examples.
   - Automatic furigana annotation now covers `N3`, `N2`, `N1`, and `級外` vocabulary.
   - Mixed kana/kanji words now annotate only the kanji segment, so forms like `病気がちな` render as `病気(びょうき)がちな`.
   - Affected files:
     - `src/components/Quiz.tsx`

4. **Quiz meaning cleanup**
   - Removed placeholder meanings such as bare `뜻` / `의미` from the dataset.
   - Removed meta prefixes like `일본어로 ...` from quiz answers so options now show natural Korean meanings.
   - Cleaned several explanation-style meanings such as `...다는 뜻`, `직역하면 ...`, and similar quiz-hostile phrasing.
   - Corrected multiple broken meanings that were mapped to the wrong Japanese headword.
   - Example fixed entries include:
     - `メール1軒` -> `메일 한 건`
     - `件名` -> `제목, 메일 제목`
     - `一昨年` -> `재작년`
     - `報告があります` -> `보고할 것이 있습니다`
     - `〜ますように祈る` restored from malformed source text
   - Choice generation now excludes placeholder values even if a bad dataset entry slips in later.
   - Affected files:
     - `voca_json/VOCA_word_furigana_separated.json`
     - `src/data/vocab.json`
     - `src/components/Quiz.tsx`
     - `scripts/transform_japanese_data.mjs`

5. **Wall of Pain behavior cleanup**
   - Wall of Pain cards are now informational only and no longer navigate into quizzes.
   - Review routing bugs were fixed before that change so clicked entries no longer opened unrelated quiz cards or empty review states.
   - Affected files:
     - `src/components/ReviewTab.tsx`
     - `src/components/QuizLoader.tsx`
     - `src/components/Quiz.tsx`

6. **Dataset deduplication pass**
   - Performed a full duplicate/similar-entry audit across the source vocabulary dataset.
   - Removed exact duplicate records and same-word duplicates.
   - Merged several near-duplicate entries by keeping one canonical record and combining/correcting meanings, furigana, or examples where appropriate.
   - Regenerated the duplicate report after cleanup.
   - Current post-cleanup state:
     - exact duplicate records: `0`
     - same-word duplicates: `0`
     - same-furigana different-word groups: `1`
     - same-meaning different-word groups: `5`
   - Remaining groups are intentional semantic neighbors or same-reading/different-kanji pairs that still require product judgment rather than automatic deletion.
   - Affected files:
     - `voca_json/VOCA_word_furigana_separated.json`
     - `src/data/vocab.json`
     - `duplicated.md`

7. **Example sentence naturalness edits**
   - Rewrote awkward or over-explanatory example sentences into more natural spoken/written Japanese where surfaced during QA.
   - Example:
     - `マヨラー` examples were rewritten to sound like natural colloquial usage instead of explanatory dictionary text.
   - Affected files:
     - `voca_json/VOCA_word_furigana_separated.json`
     - `src/data/vocab.json`

The following earlier platform changes remain part of the current app behavior:

1. **Hall of Fame & Wall of Pain (Auth Fixes)**
   - **Seeding**: Fully populated `globalWordStats` to enable the "Wall of Pain" feature.
   - **Auth Sync**: Optimized Firestore listeners in `GamificationContext.tsx` to prevent memory leaks and ensure immediate UI updates after login.
   - **UI Robustness**: Implemented `onError` fallbacks for all profile images, ensuring themed initials appear if images are missing or blocked.
   - **Enhanced Logging**: Added diagnostic logs to `UserProfile.tsx` to monitor authentication transitions in real-time.
   - **Migration to Firestore**: Migrated all local vocabulary datasets to Firestore to ensure persistent and scalable data management.
   - Affected files: `scripts/seed-ranks.mjs`, `public/images/avatars/`, Firestore collections (`vocabEntries`, `fullVocaEntries`, `users`, `datasetMeta`).

2. **Leaderboard Image Support for Local Paths**
   - Updated `Leaderboard.tsx` to support both external (Firebase/Google) `http` URLs and local relative paths (starting with `/`).
   - This ensures that local assets like generated avatars render correctly alongside authenticated user photos.
   - Affected file: `src/components/Leaderboard.tsx`

3. **gcloud CLI Provisioning (macOS Monterey)**
   - Documented the recommended installation path for `google-cloud-sdk` via **MacPorts** (`port`) to ensure compatibility with older macOS versions.
   - Command: `sudo port install google-cloud-sdk`
   - Verified installation version: `Google Cloud SDK 559.0.0`

4. **Restructured Example Sentences with Ruby Furigana**
   - Re-introduced example sentences in a structured `example: string[]` format.
   - Implemented `FuriganaSentence` component in `Quiz.tsx` to automatically render `Text(Furigana)` patterns into standard HTML `<ruby>` tags.
   - Integrated these examples into the quiz feedback bar for contextual learning immediately after answering.
   - Removed the noisy previous `sentences` logic that occasionally showed unnatural dialogue markers.
   - Affected files: `src/data/vocab.json`, `src/utils/vocab.ts`, `src/components/Quiz.tsx`, `scripts/transform_japanese_data.mjs`

2. **Distractor logic hardened by POS-only grouping**
   - Choice generation now enforces same POS bucket for distractors instead of mixing fallback choices from any category.
   - Added `inferPOS(...)` to handle current dataset reality where many entries are tagged as `pos: "other"`.
   - `inferPOS(...)` flow:
     - use explicit POS tag if available (`noun/verb/adjective`)
     - else infer from Japanese surface endings (`する`, `れる`, `...う`, `...い`, `...しい`, etc.)
     - default fallback bucket is `noun`
   - Updated both quiz option generation and random-word helper to use `inferPOS`.
   - Affected files:
     - `src/utils/vocab.ts`
     - `src/components/Quiz.tsx`

3. **Map node icon visibility bug fixed**
   - Root cause: map icons used `next/image` with `fill`, but parent wrappers had no guaranteed dimensions in utility CSS, causing invisible icons.
   - Fix: switched node icons to fixed-size `Image` (`width`/`height`) for stable rendering.
   - Affected file: `src/app/page.tsx`

4. **Unit fail badge count now visibly rendered**
   - Added explicit text style class for the red circular fail badge (`.fail-badge-count`) so numbers always appear.
   - Replaced undefined legacy class usage (`vol-count`, `vol1-count`) with defined class.
   - Affected files:
     - `src/app/page.tsx`
     - `src/app/globals.css`

5. **Unit fail badge metric corrected**
   - Previous behavior counted only distinct failed words in the unit.
   - New behavior sums total mistake occurrences for words in the unit, so if failed/unknown count is 2, badge shows `2`.
   - Added normalized key lookup handling (`raw` and lowercase trimmed keys).
   - Affected file: `src/app/page.tsx`

6. **Wall of Pain data logic revalidated and aligned**
   - Global ranking now uses `failCount` only (actual global wrong/unknown accumulation), not `seedCount + failCount`.
   - Added normalized word-key matching for better map/join reliability between Firestore and local vocab metadata.
   - Session cache behavior changed:
     - cached data can render immediately
     - but fetch now always refreshes from Firestore when possible to avoid stale global rankings
   - `ReviewTab` now explicitly refreshes global stats when mistakes change, so newly failed words can surface in Wall of Pain without waiting for a new session.
   - Affected files:
     - `src/hooks/useGlobalTop20.ts`
     - `src/components/ReviewTab.tsx`

7. **Persistent top header while scrolling**
   - Updated the top `KamiVoca` header behavior so it stays visible during vertical scroll.
   - Switched header positioning from sticky to fixed for more consistent behavior across mobile browsers.
   - Added top padding to the main content container to prevent overlap with the fixed header.
   - Affected files:
     - `src/app/globals.css`
     - `src/app/page.tsx`

8. **Lint validation and Build Fixes**
    - All touched TypeScript files were lint-checked and verified.
    - Fixed a critical GitHub build error caused by ID type mismatches between the data and interfaces.

9. **Schema Cleanup and Optimization**
    - Removed unused keys: `cog_score`, `synonyms`, and `sentences` from `vocab.json` and `VocabEntry` interface.
    - These fields were identified as redundant or not utilized by the current application UI/logic, reducing the overall dataset size.
    - Simplified the `vocab.json` root structure by removing the redundant `totalWords` key (now dynamically calculated).
    - Affected files: `src/data/vocab.json`, `src/utils/vocab.ts`, `scripts/transform_japanese_data.mjs`

10. **ID Refactoring and Data Quality Enhancements**
    - Refactored all vocabulary IDs to zero-padded strings (e.g., `"0001"`, `"0002"`) to resolve TypeScript type mismatches and ensure stable lexicographical sorting.
    - This fix resolved a major GitHub build error where the data IDs (numeric) conflicted with the interface (string).
    - Affected files: `src/data/vocab.json`, `src/utils/vocab.ts`, `scripts/transform_japanese_data.mjs`

11. **Global Even Level Distribution & Playwright E2E Testing**
    - Refactored the 15-level distribution logic to be completely even globally (92-93 words per level) while maintaining JLPT (N5-N1) order.
    - Preserved the `opic` field in `vocab.json` for better cross-framework compatibility.
    - Integrated Playwright for comprehensive E2E testing, including custom mobile viewports for **Galaxy S25** and **iPhone 16 Pro**.
    - Verified furigana rendering in example sentences via automated web tests.
    - Affected files: `scripts/transform_japanese_data.mjs`, `src/data/vocab.json`, `playwright.config.ts`, `tests/vocab-levels.spec.ts`

12. **Dynamic Weather Effects & Date Display**
    - Integrated Open-Meteo API to fetch real-time weather, including **high/low temperature ranges**.
    - Implemented **Solar (Gregorian) and Lunar (Lunar/Chinese)** date display using native `Intl.DateTimeFormat`.
    - Added a performant Canvas-based particle system (`WeatherBackground.tsx`) to render dynamic effects like Rain, Snow, and Thunder.
    - Designed premium blurred-glass badges for a clean, non-intrusive UI in the pilgrimage background.
    - Verified mobile responsiveness and performance on **Galaxy S25** and **iPhone** viewports.
    - Affected files: `src/hooks/useWeather.ts`, `src/components/WeatherBackground.tsx`, `src/app/layout.tsx`

13. **UI Version Fix**
    - Updated `APP_VERSION` string in `src/lib/constants.ts` so the in-app badge matches the package version.
    - Affected files: `src/lib/constants.ts`

14. **Weather Display Refinement (Location & Positioning)**
    - Implemented real-time **Reverse Geocoding** using the BigDataCloud API to fetch and display the user's current city name.
    - Optimized weather widget positioning to `top: 210px`, ensuring zero overlap with celestial bodies (Sun/Moon) across all devices.
    - Specifically refined celestial visibility logic to show the **Sun and Moon even in cloudy weather**, preserving a premium visual experience.
    - Refined the **Daytime Background** with a more vibrant, deep blue gradient for better atmosphere.
    - Added English city name display in a new elegant blurred-glass chip.
    - Verified layout stability on a high-fidelity **Galaxy S25** simulation.
    - Affected files: `src/hooks/useWeather.ts`, `src/components/WeatherBackground.tsx`, `README.md`, `src/lib/constants.ts`, `package.json`

15. **Test File Cleanup**
    - Removed all temporary test scripts and Playwright test files used during debugging to keep the repository clean.

16. **Weather Data Persistence & Caching**
    - Implemented `localStorage` caching for weather information (location, sunrise/sunset, high/low temperatures).
    - Added a robust fallback mechanism that displays cached data if geolocation or API calls fail.
    - Optimized React component lifecycle to prevent redundant state updates and improve performance.
    - Affected files: `src/hooks/useWeather.ts`, `src/components/WeatherBackground.tsx`, `src/app/page.tsx`

17. **Weather Update Progress Visualization**
    - Implemented a sleek, animated progress bar that appears at the bottom center of the screen during weather and location updates.
    - Provides real-time status messages (e.g., "Locating...", "Fetching Weather...", "Detecting City...").
    - Features premium animations, including a shimmer effect and a subtle pulse on the status text.
    - Optimized to only appear when necessary and disappear smoothly upon completion or failure.
    - Affected files: `src/hooks/useWeather.ts`, `src/components/WeatherBackground.tsx`

18. **Weather Update Failure Handling & Interactive Retry**
    - Enhanced the weather progress bar to handle failures gracefully, displaying "UPDATE FAILED ↻" or "LOCATION DENIED ↻".
    - Implemented **Interactive Retry**: Users can click the progress bar during a failed state to manually re-trigger the weather/location update.
    - Integrated **Auto-Dismissal Logic**: Completion messages disappear after 5s, while failure messages persist for 8s (if not interacted with) to maintain a clean UI.
    - Optimized `useWeather` hook with improved TypeScript safety and resolved lint errors (`npm run build` verified).
    - Affected files: `src/hooks/useWeather.ts`, `src/components/WeatherBackground.tsx`


### 👥 Social & Engagement

- **Home (巡礼)**: Core learning path and Pilgrimage maps.
- **Leaderboard (ランキング)**: Weekly leagues (Bronze, Silver, Gold, Shogun) powered by a real-time XP scoring system.
- **Review (復習)**: Personal mistake lists and the global **TOP 20 Hardest Words** leaderboard.
- **Profile (マイページ)**: Tracks total XP, daily streaks (Sun/Fire icon), and traditional avatars (e.g., Samurai, Geisha, Shiba Inu).

---

## 📊 Dataset Maintenance

To add or update vocabulary, modify the source JSON files and run the transformation script.

### JSON Schema (`src/data/vocab.json`)

The application consumes `src/data/vocab.json`, which is a transformed version of the integrated dataset. This file is also used to synchronize the Firestore `vocabEntries` collection.

---

### Running the Pipeline

After updating the data, run:

```bash
node scripts/transform_japanese_data.mjs
```

This will regenerate `src/data/vocab.json`. To sync this data to the cloud:

```bash
# Sync standard vocabulary
npm run sync:firestore:vocab

# Sync detailed vocabulary (with furigana separation)
npm run sync:firestore:full-voca
```

These scripts use the **Firebase Admin SDK** and require the service account key in `secrets/`.

---

## 🛠️ Technical Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router, Client Components)
- **Backend-as-a-Service**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Hosting)
  - Real-time cloud sync with offline support and unified Google Login.
- **Design/Styling**: Vanilla CSS & Tailwind with the KamiVoca traditional palette.
- **Icons & Media**: [Lucide React](https://lucide.dev/) & optimized local assets. All local assets (images, sounds) use `BASE_PATH` (configured via `NEXT_PUBLIC_BASE_PATH`) to ensure proper loading on sub-paths like GitHub Pages.
- **Audio Engine**: Custom **WebAudio API** integrator for multi-browser compatibility.
- **CI/CD Security**: GitHub Actions workflow is hardened using **GitHub Repository Secrets**. Hardcoded credentials are strictly prohibited in the codebase.

---

## 🔧 Setup & Local Development

### Prerequisites

- Node.js 18+
- A Google Firebase Project (for Auth & Firestore)

### Installation

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Configure your Firebase credentials in `src/lib/firebase.ts`.
3. Start the development server:

   ```bash
   npm run dev
   ```

### 📱 Device Compatibility Target

KamiVoca strictly runs flawlessly across:

- **PC/Desktop**: Windows (Chrome), macOS (Safari, Chrome)
- **Mobile/Tablet**: iOS (Safari), Android (Targeting Galaxy S25 base resolution)

---

## 🔄 Multi-Device Development Workflow

To maintain consistency across multiple development environments, follow this strictly:

1. **README Update First**: Ensure any new features are documented in this `README.md` *before* syncing to GitHub.
2. **CP Git Strategy**: Commit using the standard `CP` message policy to automate syncs.
3. **No Virtual Environments Included**: `.venv` arrays MUST remain in `.gitignore`.
4. **Validation Check**: Run a final format and vulnerability scan prior to branching pushing.

---
---
KamiVocaで、神レベルの日本語を。✨🇯🇵
Enjoy your pilgrimage to mastery with KamiVoca!
